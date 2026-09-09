import { error } from '@sveltejs/kit';
import fs from 'node:fs';
import { Readable } from 'node:stream';
import type { RequestHandler } from './$types';
import { st } from '$lib/server/i18n';
import { avatarPath } from '$lib/server/storage';

export const GET: RequestHandler = (event) => {
	if (!/^[A-Za-z0-9_-]{6,32}$/.test(event.params.id)) throw error(404, st(event.locals.lang, 'err.notFound'));
	const file = avatarPath(event.params.id);
	if (!fs.existsSync(file)) throw error(404, st(event.locals.lang, 'err.notFound'));
	const size = fs.statSync(file).size;
	return new Response(Readable.toWeb(fs.createReadStream(file)) as ReadableStream, {
		headers: {
			'content-type': 'image/webp',
			'content-length': String(size),
			'cache-control': 'private, max-age=31536000, immutable'
		}
	});
};
