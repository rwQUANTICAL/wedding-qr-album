import { error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { listMedia } from '$lib/server/media';
import { st } from '$lib/server/i18n';

export const load: PageServerLoad = ({ locals }) => {
	if (!locals.guest) throw error(403, st(locals.lang, 'err.nameRequired'));
	return { items: listMedia(locals.guest.id, { mine: true, limit: 200 }) };
};
