import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { createGuest, renameGuest } from '$lib/server/auth';
import { LIMITS } from '$lib/server/env';
import { readJson } from '$lib/server/guard';
import { error } from '@sveltejs/kit';
import { st } from '$lib/server/i18n';

export const GET: RequestHandler = (event) => {
	return json({ guest: event.locals.guest, isAdmin: event.locals.isAdmin });
};

export const POST: RequestHandler = async (event) => {
	const body = await readJson<{ name?: string }>(event);
	const name = (body.name ?? '').trim().slice(0, LIMITS.nameChars);
	if (name.length < 1) throw error(400, st(event.locals.lang, 'err.enterName'));
	const guest = event.locals.guest ? renameGuest(event.locals.guest, name) : createGuest(event.cookies, name);
	return json({ guest });
};
