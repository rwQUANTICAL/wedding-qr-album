import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { requireAdmin } from '$lib/server/guard';
import { listGuests } from '$lib/server/media';

export const GET: RequestHandler = (event) => {
	requireAdmin(event);
	return json({ guests: listGuests() });
};
