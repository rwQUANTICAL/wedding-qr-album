import { error, type RequestEvent } from '@sveltejs/kit';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { pipeline } from 'node:stream/promises';
import { Readable } from 'node:stream';
import { st } from './i18n';

const MAX_IMAGE_BYTES = 30 * 1024 * 1024;
const IMAGE_EXT = /\.(heic|heif|jpe?g|png|webp)$/i;
const BY_TYPE: Record<string, string> = {
	'image/jpeg': 'jpg',
	'image/png': 'png',
	'image/webp': 'webp',
	'image/heic': 'heic',
	'image/heif': 'heif'
};

export function imageExt(type: string, filename: string): string {
	if (BY_TYPE[type]) return BY_TYPE[type];
	const match = /\.([a-z0-9]{2,5})$/i.exec(filename);
	return match ? match[1].toLowerCase() : 'jpg';
}

/** Prüft die Header eines Bild-Uploads und streamt den Body in eine temporäre Datei. */
export async function receiveImage(
	event: RequestEvent,
	prefix: string
): Promise<{ tmp: string; ext: string }> {
	const type = (event.request.headers.get('content-type') ?? '').split(';')[0].trim();
	const filename = decodeURIComponent(event.request.headers.get('x-filename') ?? '');
	if (!type.startsWith('image/') && !IMAGE_EXT.test(filename))
		throw error(415, st(event.locals.lang, 'err.fileType', { type: type || '?' }));
	if (Number(event.request.headers.get('content-length') ?? 0) > MAX_IMAGE_BYTES)
		throw error(413, st(event.locals.lang, 'err.tooLarge', { mb: 30 }));
	if (!event.request.body) throw error(400, st(event.locals.lang, 'err.emptyUpload'));

	const ext = imageExt(type, filename);
	const tmp = path.join(os.tmpdir(), `${prefix}-${Date.now()}.${ext}`);
	try {
		await pipeline(Readable.fromWeb(event.request.body as never), fs.createWriteStream(tmp));
	} catch {
		fs.rmSync(tmp, { force: true });
		throw error(400, st(event.locals.lang, 'err.uploadAborted'));
	}
	return { tmp, ext };
}
