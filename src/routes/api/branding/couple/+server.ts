import { error, json } from '@sveltejs/kit';
import fs from 'node:fs';
import { Readable } from 'node:stream';
import type { RequestHandler } from './$types';
import { requireAdmin } from '$lib/server/guard';
import { processAvatar } from '$lib/server/image';
import { st } from '$lib/server/i18n';
import { bumpCouplePhoto, clearCouplePhoto } from '$lib/server/settings';
import { receiveImage } from '$lib/server/upload';
import { couplePhotoPath, ensureBrandingDir } from '$lib/server/storage';

export const GET: RequestHandler = (event) => {
	const file = couplePhotoPath();
	if (!fs.existsSync(file)) throw error(404, st(event.locals.lang, 'err.notFound'));
	const size = fs.statSync(file).size;
	return new Response(Readable.toWeb(fs.createReadStream(file)) as ReadableStream, {
		headers: {
			'content-type': 'image/webp',
			'content-length': String(size),
			'cache-control': 'public, max-age=31536000, immutable'
		}
	});
};

export const POST: RequestHandler = async (event) => {
	requireAdmin(event);
	const { tmp, ext } = await receiveImage(event, 'couple');

	ensureBrandingDir();
	try {
		await processAvatar(tmp, ext, couplePhotoPath());
	} catch {
		throw error(400, st(event.locals.lang, 'err.uploadAborted'));
	} finally {
		fs.rmSync(tmp, { force: true });
	}
	return json({ photoVersion: bumpCouplePhoto() });
};

export const DELETE: RequestHandler = (event) => {
	requireAdmin(event);
	fs.rmSync(couplePhotoPath(), { force: true });
	clearCouplePhoto();
	return json({ photoVersion: 0 });
};
