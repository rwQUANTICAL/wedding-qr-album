import { error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { st } from '$lib/server/i18n';

export const load: PageServerLoad = ({ locals }) => {
	if (!locals.isAdmin) throw error(403, st(locals.lang, 'err.adminOnly'));
	return {};
};
