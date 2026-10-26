import { error, json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { readJson, requireAdmin } from '$lib/server/guard';
import { st } from '$lib/server/i18n';
import { branding, setEventTitle } from '$lib/server/settings';

export const PUT: RequestHandler = async (event) => {
	requireAdmin(event);
	const body = await readJson<{ eventTitle?: string }>(event);

	if (typeof body.eventTitle === 'string') {
		if (!body.eventTitle.trim()) throw error(400, st(event.locals.lang, 'err.nameRequired'));
		setEventTitle(body.eventTitle);
	}

	return json(branding());
};
