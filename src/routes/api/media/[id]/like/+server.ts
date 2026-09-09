import { error, json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { requireGuest } from '$lib/server/guard';
import { getMediaRow, setLike } from '$lib/server/media';
import { st } from '$lib/server/i18n';

/** Body { liked: boolean } setzt den Zustand idempotent; ohne Body wird umgeschaltet. */
export const POST: RequestHandler = async (event) => {
	const guest = requireGuest(event);
	if (!getMediaRow(event.params.id)) throw error(404, st(event.locals.lang, 'err.notFound'));
	let liked: boolean | null = null;
	if (event.request.headers.get('content-type')?.includes('application/json')) {
		const body = (await event.request.json().catch(() => ({}))) as { liked?: unknown };
		if (typeof body.liked === 'boolean') liked = body.liked;
	}
	return json(setLike(event.params.id, guest.id, liked));
};
