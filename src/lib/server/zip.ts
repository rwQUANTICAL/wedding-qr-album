import { ZipArchive } from 'archiver';
import fs from 'node:fs';
import { PassThrough, Readable } from 'node:stream';
import type { MediaRow } from './db';
import { variantPath } from './storage';

export type ZipRow = MediaRow & { guest_name: string };

function safeName(value: string): string {
	return value.replace(/[^\p{L}\p{N} _-]/gu, '').trim() || 'Gast';
}

export function zipResponse(rows: ZipRow[], filename: string, groupByGuest: boolean): Response {
	const archive = new ZipArchive({ store: true });
	const out = new PassThrough();
	archive.on('error', (err) => out.destroy(err));
	archive.on('warning', (err) => console.warn('[zip]', err.message));
	archive.pipe(out);

	for (const row of rows) {
		if (row.status !== 'ready') continue;
		const variant = row.kind === 'photo' ? 'original' : 'video';
		const file = variantPath(row.id, variant);
		if (!fs.existsSync(file)) continue;
		const stamp = row.created_at.replace(/[^0-9]/g, '').slice(0, 14);
		const base = `${stamp}-${row.id}.${row.kind === 'photo' ? 'jpg' : 'mp4'}`;
		archive.file(file, { name: groupByGuest ? `${safeName(row.guest_name)}/${base}` : `${safeName(row.guest_name)}-${base}` });
	}
	archive.finalize();

	return new Response(Readable.toWeb(out) as ReadableStream, {
		headers: {
			'content-type': 'application/zip',
			'content-disposition': `attachment; filename="${filename}"`
		}
	});
}
