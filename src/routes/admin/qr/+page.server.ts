import { error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { st } from '$lib/server/i18n';
import { inviteUrl, qrSvg } from '$lib/server/qr';

export const load: PageServerLoad = async ({ locals, url }) => {
	if (!locals.isAdmin) throw error(403, st(locals.lang, 'err.adminOnly'));
	const link = inviteUrl(url.origin);
	return { inviteUrl: link, qrSvg: await qrSvg(link) };
};
