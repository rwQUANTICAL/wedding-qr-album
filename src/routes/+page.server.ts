import type { PageServerLoad } from './$types';
import { listMedia } from '$lib/server/media';

export const load: PageServerLoad = ({ locals }) => {
	return { items: listMedia(locals.guest?.id ?? null, { limit: 80 }) };
};
