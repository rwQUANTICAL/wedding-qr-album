import fs from 'node:fs/promises';
import { db, type MediaRow } from './db';
import { processPhoto } from './image';
import { processVideo } from './video';
import { rawPath } from './storage';

const CONCURRENCY = 2;
const MAX_ATTEMPTS = 2;

const state = (globalThis as unknown as { __wpQueue?: { running: number; started: boolean } }).__wpQueue ?? { running: 0, started: false };
(globalThis as unknown as { __wpQueue: typeof state }).__wpQueue = state;

interface JobRow {
	id: number;
	media_id: string;
	attempts: number;
}

export function enqueue(mediaId: string): void {
	db.prepare('INSERT INTO jobs (media_id) VALUES (?)').run(mediaId);
	setImmediate(pump);
}

export function startWorker(): void {
	if (state.started) return;
	state.started = true;
	db.prepare("UPDATE jobs SET state = 'queued' WHERE state = 'running'").run();
	pump();
}

function pump(): void {
	while (state.running < CONCURRENCY) {
		const job = claim();
		if (!job) return;
		state.running++;
		work(job)
			.catch((err) => console.error('[queue] unerwarteter Fehler', err))
			.finally(() => {
				state.running--;
				pump();
			});
	}
}

function claim(): JobRow | null {
	const tx = db.transaction(() => {
		const job = db.prepare("SELECT id, media_id, attempts FROM jobs WHERE state = 'queued' ORDER BY id LIMIT 1").get() as JobRow | undefined;
		if (!job) return null;
		db.prepare("UPDATE jobs SET state = 'running', attempts = attempts + 1 WHERE id = ?").run(job.id);
		return job;
	});
	return tx();
}

async function work(job: JobRow): Promise<void> {
	const media = db.prepare('SELECT * FROM media WHERE id = ?').get(job.media_id) as MediaRow | undefined;
	if (!media || !media.raw_ext) {
		db.prepare("UPDATE jobs SET state = 'done' WHERE id = ?").run(job.id);
		return;
	}
	try {
		await processMedia(media);
		db.prepare("UPDATE jobs SET state = 'done' WHERE id = ?").run(job.id);
	} catch (err) {
		const message = err instanceof Error ? err.message : String(err);
		console.error(`[queue] ${media.id} fehlgeschlagen:`, message);
		if (job.attempts < MAX_ATTEMPTS) {
			db.prepare("UPDATE jobs SET state = 'queued', error = ? WHERE id = ?").run(message, job.id);
			return;
		}
		db.prepare("UPDATE jobs SET state = 'failed', error = ? WHERE id = ?").run(message, job.id);
		db.prepare("UPDATE media SET status = 'failed', error = ? WHERE id = ?").run(message, media.id);
	}
}

async function processMedia(media: MediaRow): Promise<void> {
	const raw = rawPath(media.id, media.raw_ext!);
	if (media.kind === 'photo') {
		const crop = media.crop ? JSON.parse(media.crop) : null;
		const result = await processPhoto(media.id, raw, media.raw_ext!, { rotation: media.rotation, crop });
		db.prepare("UPDATE media SET status = 'ready', width = ?, height = ?, taken_at = COALESCE(taken_at, ?), error = NULL WHERE id = ?")
			.run(result.width, result.height, result.takenAt, media.id);
		return;
	}
	const result = await processVideo(media.id, raw);
	db.prepare("UPDATE media SET status = 'ready', width = ?, height = ?, duration_s = ?, taken_at = ?, raw_ext = NULL, error = NULL WHERE id = ?")
		.run(result.width, result.height, result.duration, result.takenAt, media.id);
	await fs.rm(raw, { force: true });
}
