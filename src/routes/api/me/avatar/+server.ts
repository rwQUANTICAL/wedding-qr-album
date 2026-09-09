import { error, json } from '@sveltejs/kit';
import fs from 'node:fs';
import type { RequestHandler } from './$types';
import { db } from '$lib/server/db';
import { requireGuest } from '$lib/server/guard';
import { processAvatar } from '$lib/server/image';
import { st } from '$lib/server/i18n';
import { receiveImage } from '$lib/server/upload';
import { avatarPath, ensureAvatarDir } from '$lib/server/storage';

export const POST: RequestHandler = async (event) => {
	const guest = requireGuest(event);
	const { tmp, ext } = await receiveImage(event, `avatar-${guest.id}`);

	ensureAvatarDir();
	try {
		await processAvatar(tmp, ext, avatarPath(guest.id));
	} catch {
		throw error(400, st(event.locals.lang, 'err.uploadAborted'));
	} finally {
		fs.rmSync(tmp, { force: true });
	}
	db.prepare('UPDATE guests SET avatar = avatar + 1 WHERE id = ?').run(guest.id);
	return json({ guest: db.prepare('SELECT * FROM guests WHERE id = ?').get(guest.id) });
};

export const DELETE: RequestHandler = (event) => {
	const guest = requireGuest(event);
	fs.rmSync(avatarPath(guest.id), { force: true });
	db.prepare('UPDATE guests SET avatar = 0 WHERE id = ?').run(guest.id);
	return json({ guest: db.prepare('SELECT * FROM guests WHERE id = ?').get(guest.id) });
};
