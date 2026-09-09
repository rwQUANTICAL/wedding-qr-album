import { error } from '@sveltejs/kit';
import fs from 'node:fs';
import sharp from 'sharp';
import { Readable } from 'node:stream';
import type { RequestHandler } from './$types';
import {  } from '$lib/server/guard';
import { getMediaRow } from '$lib/server/media';
import { CONTENT_TYPES, isVariant, variantPath } from '$lib/server/storage';
import { ensureVariant } from '$lib/server/image';
import { st } from '$lib/server/i18n';

function downloadName(id: string, kind: string, createdAt: string, ext: string): string {
	const stamp = createdAt.replace(/[^0-9]/g, '').slice(0, 14);
	return `hochzeit-${stamp}-${id}.${ext}`;
}

function parseRange(header: string | null, size: number): { start: number; end: number } | null {
	const match = /^bytes=(\d*)-(\d*)$/.exec(header ?? '');
	if (!match) return null;
	const start = match[1] ? Number(match[1]) : 0;
	const end = match[2] ? Math.min(Number(match[2]), size - 1) : size - 1;
	if (start > end || start >= size) return null;
	return { start, end };
}

export const GET: RequestHandler = async (event) => {
	const { id, variant } = event.params;
	if (!isVariant(variant)) throw error(404, st(event.locals.lang, 'err.unknownVariant'));
	const row = getMediaRow(id);
	if (!row) throw error(404, st(event.locals.lang, 'err.notFound'));

	const file = variantPath(id, variant);
	if (!fs.existsSync(file) && variant === 'card' && row.kind === 'photo') await ensureVariant(id, 'card');
	if (!fs.existsSync(file) && variant === 'card' && row.kind === 'video') {
		const poster = variantPath(id, 'poster');
		if (fs.existsSync(poster)) await sharp(poster).resize({ width: 900, height: 900, fit: 'inside' }).webp({ quality: 80 }).toFile(file);
	}
	if (!fs.existsSync(file)) throw error(404, st(event.locals.lang, 'err.notReady'));
	const size = fs.statSync(file).size;

	const headers = new Headers({
		'content-type': CONTENT_TYPES[variant],
		'cache-control': 'private, max-age=31536000, immutable',
		'accept-ranges': 'bytes'
	});
	if (event.url.searchParams.has('download')) {
		const ext = variant === 'video' ? 'mp4' : variant === 'original' ? 'jpg' : 'webp';
		headers.set('content-disposition', `attachment; filename="${downloadName(id, row.kind, row.created_at, ext)}"`);
	}

	const range = parseRange(event.request.headers.get('range'), size);
	if (range) {
		headers.set('content-range', `bytes ${range.start}-${range.end}/${size}`);
		headers.set('content-length', String(range.end - range.start + 1));
		const stream = fs.createReadStream(file, { start: range.start, end: range.end });
		return new Response(Readable.toWeb(stream) as ReadableStream, { status: 206, headers });
	}

	headers.set('content-length', String(size));
	return new Response(Readable.toWeb(fs.createReadStream(file)) as ReadableStream, { headers });
};
