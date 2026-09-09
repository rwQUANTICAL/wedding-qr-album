import { redirect } from '@sveltejs/kit';
import type { LayoutServerLoad } from './$types';
import { stats } from '$lib/server/media';
import { branding } from '$lib/server/settings';
import { recoveryToken } from '$lib/server/auth';
import { inviteUrl } from '$lib/server/qr';

export const load: LayoutServerLoad = ({ url, locals }) => {
	if (url.searchParams.has('key')) {
		const clean = new URL(url);
		clean.searchParams.delete('key');
		redirect(302, clean.pathname + clean.search);
	}

	const needsName = !locals.guest && !locals.isAdmin;
	if (needsName && url.pathname !== '/welcome') redirect(302, '/welcome');

	const brand = branding();
	return {
		guest: locals.guest,
		lang: locals.lang,
		isAdmin: locals.isAdmin,
		eventTitle: brand.eventTitle,
		couplePhoto: brand.photoVersion > 0 ? `/api/branding/couple?v=${brand.photoVersion}` : null,
		setupDone: brand.setupDone,
		stats: stats(),
		recoveryUrl: locals.guest ? `${inviteUrl(url.origin)}r/${recoveryToken(locals.guest)}` : null
	};
};
