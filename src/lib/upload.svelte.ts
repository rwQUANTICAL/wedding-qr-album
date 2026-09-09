import { invalidateAll } from '$app/navigation';
import { i18n } from '$lib/i18n/index.svelte';
import { LIMITS } from '$lib/limits';

export type UploadState = 'checking' | 'queued' | 'uploading' | 'done' | 'error';

export interface UploadItem {
	id: number;
	file: File;
	preview: string | null;
	progress: number;
	state: UploadState;
	error: string | null;
	mediaId: string | null;
	attempts: number;
}

const PARALLEL = 2;
const MAX_ATTEMPTS = 3;

let nextId = 1;

class UploadQueue {
	items = $state<UploadItem[]>([]);
	active = $derived(this.items.filter((i) => i.state === 'checking' || i.state === 'queued' || i.state === 'uploading'));
	failed = $derived(this.items.filter((i) => i.state === 'error'));
	doneCount = $derived(this.items.filter((i) => i.state === 'done').length);
	totalProgress = $derived.by(() => {
		const relevant = this.items.filter((i) => i.state !== 'error');
		if (relevant.length === 0) return 0;
		return relevant.reduce((sum, i) => sum + (i.state === 'done' ? 1 : i.progress), 0) / relevant.length;
	});

	private running = 0;
	private picker: HTMLInputElement | null = null;

	registerPicker(input: HTMLInputElement | null): void {
		this.picker = input;
	}

	openPicker(): void {
		this.picker?.click();
	}

	async add(files: FileList | File[]): Promise<void> {
		const added: UploadItem[] = [];
		for (const file of Array.from(files)) {
			const item: UploadItem = {
				id: nextId++,
				file,
				preview: file.type.startsWith('image/') && !/hei[cf]/i.test(file.type + file.name) ? URL.createObjectURL(file) : null,
				progress: 0,
				state: 'checking',
				error: null,
				mediaId: null,
				attempts: 0
			};
			this.items.push(item);
			added.push(item);
		}
		for (const item of added) {
			const rejection = await this.reject(item.file);
			const live = this.items.find((i) => i.id === item.id);
			if (!live) continue;
			live.state = rejection ? 'error' : 'queued';
			live.error = rejection;
			this.pump();
		}
	}

	retry(id: number): void {
		const item = this.items.find((i) => i.id === id);
		if (!item || item.state !== 'error') return;
		item.state = 'queued';
		item.error = null;
		item.progress = 0;
		this.pump();
	}

	dismiss(id: number): void {
		const item = this.items.find((i) => i.id === id);
		if (item?.preview) URL.revokeObjectURL(item.preview);
		this.items = this.items.filter((i) => i.id !== id);
	}

	clearDone(): void {
		for (const item of this.items) if (item.state === 'done' && item.preview) URL.revokeObjectURL(item.preview);
		this.items = this.items.filter((i) => i.state !== 'done');
	}

	private async reject(file: File): Promise<string | null> {
		const isVideo = file.type.startsWith('video/') || /\.(mov|mp4|m4v|webm|3gp)$/i.test(file.name);
		const isPhoto = file.type.startsWith('image/') || /\.(heic|heif|jpe?g|png|webp)$/i.test(file.name);
		if (!isVideo && !isPhoto) return i18n.t('upload.err.type');
		if (isPhoto && file.size > LIMITS.photoBytes) return i18n.t('upload.err.photoSize');
		if (isVideo && file.size > LIMITS.videoBytes) return i18n.t('upload.err.videoSize');
		if (isVideo) {
			const seconds = await readVideoDuration(file);
			if (seconds != null && seconds > LIMITS.videoSeconds + 1) {
				return i18n.t('upload.err.videoLength', { s: Math.round(seconds), max: LIMITS.videoSeconds });
			}
		}
		return null;
	}

	private pump(): void {
		while (this.running < PARALLEL) {
			const next = this.items.find((i) => i.state === 'queued');
			if (!next) return;
			this.running++;
			this.send(next).finally(() => {
				this.running--;
				this.pump();
			});
		}
	}

	private async send(item: UploadItem): Promise<void> {
		item.state = 'uploading';
		item.attempts++;
		try {
			const mediaId = await postFile(item.file, (p) => (item.progress = p));
			item.mediaId = mediaId;
			item.progress = 1;
			item.state = 'done';
			void invalidateAll();
		} catch (err) {
			const message = err instanceof Error ? err.message : i18n.t('upload.err.generic');
			const retryable = !(err instanceof HttpError) || err.status >= 500;
			if (retryable && item.attempts < MAX_ATTEMPTS) {
				await wait(800 * item.attempts);
				item.state = 'queued';
				return;
			}
			item.state = 'error';
			item.error = message;
		}
	}
}

class HttpError extends Error {
	constructor(public status: number, message: string) {
		super(message);
	}
}

function wait(ms: number): Promise<void> {
	return new Promise((r) => setTimeout(r, ms));
}

function postFile(file: File, onProgress: (p: number) => void): Promise<string> {
	return new Promise((resolve, reject) => {
		const xhr = new XMLHttpRequest();
		xhr.open('POST', '/api/media');
		xhr.setRequestHeader('content-type', file.type || 'application/octet-stream');
		xhr.setRequestHeader('x-filename', encodeURIComponent(file.name));
		xhr.upload.onprogress = (e) => {
			if (e.lengthComputable) onProgress(e.loaded / e.total);
		};
		xhr.onerror = () => reject(new Error(i18n.t('upload.err.network')));
		xhr.onload = () => {
			if (xhr.status >= 200 && xhr.status < 300) {
				resolve(JSON.parse(xhr.responseText).id);
				return;
			}
			let message = `Fehler ${xhr.status}`;
			try {
				message = JSON.parse(xhr.responseText).message ?? message;
			} catch {
				/* leerer Body */
			}
			reject(new HttpError(xhr.status, message));
		};
		xhr.send(file);
	});
}

function readVideoDuration(file: File): Promise<number | null> {
	return new Promise((resolve) => {
		const video = document.createElement('video');
		video.preload = 'metadata';
		const url = URL.createObjectURL(file);
		const finish = (value: number | null) => {
			URL.revokeObjectURL(url);
			resolve(value);
		};
		video.onloadedmetadata = () => finish(isFinite(video.duration) ? video.duration : null);
		video.onerror = () => finish(null);
		setTimeout(() => finish(null), 4000);
		video.src = url;
	});
}

export const uploads = new UploadQueue();
