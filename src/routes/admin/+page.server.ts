import { error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { listGuests, listMedia, stats } from '$lib/server/media';
import { inviteUrl, qrSvg } from '$lib/server/qr';
import { systemStatus } from '$lib/server/system';
import { st } from '$lib/server/i18n';

export const load: PageServerLoad = async ({ locals, url }) => {
	if (!locals.isAdmin) throw error(403, st(locals.lang, 'err.adminOnly'));
	const link = inviteUrl(url.origin);
	return {
		stats: stats(),
		inviteUrl: link,
		qrSvg: await qrSvg(link),
		items: listMedia(locals.guest?.id ?? null, { limit: 200 }),
		guests: listGuests().map((g) => ({ ...g, recoveryUrl: `${link}r/${g.recoveryToken}` })),
		meId: locals.guest?.id ?? null,
		system: await systemStatus()
	};
};
