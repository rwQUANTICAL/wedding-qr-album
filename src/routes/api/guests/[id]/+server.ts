import { error, json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { readJson, requireAdmin } from '$lib/server/guard';
import { st } from '$lib/server/i18n';
import { deleteGuest, listGuests, setGuestAdmin } from '$lib/server/media';

export const PATCH: RequestHandler = async (event) => {
	requireAdmin(event);
	const body = await readJson<{ isAdmin?: boolean }>(event);
	if (typeof body.isAdmin !== 'boolean') throw error(400, st(event.locals.lang, 'err.badBody'));
	if (event.locals.guest?.id === event.params.id && !body.isAdmin) throw error(400, st(event.locals.lang, 'err.selfAdmin'));
	if (!setGuestAdmin(event.params.id, body.isAdmin)) throw error(404, st(event.locals.lang, 'err.notFound'));
	return json({ guests: listGuests() });
};

export const DELETE: RequestHandler = (event) => {
	requireAdmin(event);
	if (event.locals.guest?.id === event.params.id) throw error(400, st(event.locals.lang, 'err.selfDelete'));
	if (!deleteGuest(event.params.id)) throw error(404, st(event.locals.lang, 'err.notFound'));
	return new Response(null, { status: 204 });
};
