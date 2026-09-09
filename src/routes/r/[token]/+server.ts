import { error, redirect } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { guestByRecoveryToken, loginGuest } from '$lib/server/auth';
import { st } from '$lib/server/i18n';

/** Persönlicher Zugangslink: meldet das Gerät als diesen Gast an. */
export const GET: RequestHandler = (event) => {
	const guest = guestByRecoveryToken(event.params.token);
	if (!guest) throw error(404, st(event.locals.lang, 'err.badRecovery'));
	loginGuest(event.cookies, guest);
	redirect(302, '/');
};
