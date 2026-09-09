import { error, json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { readJson, requireAdmin } from '$lib/server/guard';
import { st } from '$lib/server/i18n';
import { branding, completeSetup, setEventTitle } from '$lib/server/settings';

export const PUT: RequestHandler = async (event) => {
	requireAdmin(event);
	const body = await readJson<{ eventTitle?: string; setupDone?: boolean }>(event);

	if (typeof body.eventTitle === 'string') {
		if (!body.eventTitle.trim()) throw error(400, st(event.locals.lang, 'err.nameRequired'));
		setEventTitle(body.eventTitle);
	}
	if (body.setupDone) completeSetup();

	return json(branding());
};
