import type { Handle, HandleServerError } from '@sveltejs/kit';
import { grantAdmin, loadGuest } from '$lib/server/auth';
import { startWorker } from '$lib/server/queue';
import { readLang } from '$lib/server/i18n';

startWorker();

export const handleError: HandleServerError = ({ error, event, status }) => {
	if (status >= 500) console.error(`[${event.request.method} ${event.url.pathname}]`, error);
	return { message: status >= 500 ? 'Internal error' : (error as Error)?.message };
};

export const handle: Handle = async ({ event, resolve }) => {
	event.locals.guest = loadGuest(event.cookies);
	event.locals.isAdmin = grantAdmin(event.cookies, event.url.searchParams.get('key')) || event.locals.guest?.is_admin === 1;
	event.locals.lang = readLang(event.cookies);

	return resolve(event, {
		transformPageChunk: ({ html }) => html.replace('%lang%', event.locals.lang)
	});
};
