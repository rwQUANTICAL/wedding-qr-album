import { error, json } from '@sveltejs/kit';
import fs from 'node:fs';
import { pipeline } from 'node:stream/promises';
import { Readable } from 'node:stream';
import type { RequestHandler } from './$types';
import { LIMITS } from '$lib/server/env';
import { readJson, requireGuest } from '$lib/server/guard';
import { createMedia, deleteMedia, getMediaRow, listMedia } from '$lib/server/media';
import { enqueue } from '$lib/server/queue';
import { ensureMediaDir, rawPath } from '$lib/server/storage';
import type { MediaKind } from '$lib/server/db';
import { st } from '$lib/server/i18n';
import type { Lang } from '$lib/i18n/messages';

const PHOTO_TYPES: Record<string, string> = {
	'image/jpeg': 'jpg',
	'image/png': 'png',
	'image/webp': 'webp',
	'image/heic': 'heic',
	'image/heif': 'heif',
	'image/gif': 'gif',
	'image/avif': 'avif'
};

const VIDEO_TYPES: Record<string, string> = {
	'video/mp4': 'mp4',
	'video/quicktime': 'mov',
	'video/webm': 'webm',
	'video/3gpp': '3gp',
	'video/x-m4v': 'm4v'
};

function extFromName(name: string): string {
	const match = /\.([a-z0-9]{2,5})$/i.exec(name);
	return match ? match[1].toLowerCase() : '';
}

function classify(type: string, filename: string, lang: Lang): { kind: MediaKind; ext: string } {
	const nameExt = extFromName(filename);
	if (PHOTO_TYPES[type]) return { kind: 'photo', ext: PHOTO_TYPES[type] };
	if (VIDEO_TYPES[type]) return { kind: 'video', ext: VIDEO_TYPES[type] };
	if (['heic', 'heif', 'jpg', 'jpeg', 'png', 'webp'].includes(nameExt)) return { kind: 'photo', ext: nameExt };
	if (['mov', 'mp4', 'm4v', 'webm', '3gp'].includes(nameExt)) return { kind: 'video', ext: nameExt };
	throw error(415, st(lang, 'err.fileType', { type: type || nameExt || '?' }));
}

export const GET: RequestHandler = (event) => {
	const params = event.url.searchParams;
	const items = listMedia(event.locals.guest?.id ?? null, {
		mine: params.get('mine') === '1',
		before: params.get('before') ?? undefined,
		limit: Number(params.get('limit') ?? 60)
	});
	return json({ items });
};

export const POST: RequestHandler = async (event) => {
	const guest = requireGuest(event);
	const type = event.request.headers.get('content-type') ?? '';
	const filename = decodeURIComponent(event.request.headers.get('x-filename') ?? '').slice(0, 200);
	const declaredSize = Number(event.request.headers.get('content-length') ?? 0);
	const { kind, ext } = classify(type.split(';')[0].trim(), filename, event.locals.lang);
	const limit = kind === 'photo' ? LIMITS.photoBytes : LIMITS.videoBytes;
	if (declaredSize > limit) throw error(413, st(event.locals.lang, 'err.tooLarge', { mb: Math.round(limit / 1024 / 1024) }));
	if (!event.request.body) throw error(400, st(event.locals.lang, 'err.emptyUpload'));

	const id = createMedia(guest, kind, ext);
	ensureMediaDir(id);
	try {
		await pipeline(Readable.fromWeb(event.request.body as never), fs.createWriteStream(rawPath(id, ext)));
	} catch {
		deleteMedia(id);
		throw error(400, st(event.locals.lang, 'err.uploadAborted'));
	}
	enqueue(id);
	return json({ id, kind, status: 'processing' }, { status: 201 });
};

export const DELETE: RequestHandler = async (event) => {
	const guest = requireGuest(event);
	const body = await readJson<{ ids?: string[] }>(event);
	const ids = Array.isArray(body.ids) ? body.ids.filter((id) => typeof id === 'string').slice(0, 200) : [];
	const deleted: string[] = [];
	for (const id of ids) {
		const row = getMediaRow(id);
		if (!row) continue;
		if (row.guest_id !== guest.id && !event.locals.isAdmin) continue;
		deleteMedia(id);
		deleted.push(id);
	}
	return json({ deleted });
};
