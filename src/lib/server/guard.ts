import { error, type RequestEvent } from '@sveltejs/kit';
import type { Guest } from './db';
import { st } from './i18n';

export function requireGuest(event: RequestEvent): Guest {
	if (!event.locals.guest) throw error(401, st(event.locals.lang, 'err.nameRequired'));
	return event.locals.guest;
}

export function requireAdmin(event: RequestEvent): void {
	if (!event.locals.isAdmin) throw error(403, st(event.locals.lang, 'err.adminOnly'));
}

export async function readJson<T>(event: RequestEvent): Promise<T> {
	try {
		return (await event.request.json()) as T;
	} catch {
		throw error(400, st(event.locals.lang, 'err.badBody'));
	}
}
