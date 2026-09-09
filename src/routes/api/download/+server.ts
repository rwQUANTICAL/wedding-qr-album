import { error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { db } from '$lib/server/db';
import { st } from '$lib/server/i18n';
import { zipResponse, type ZipRow } from '$lib/server/zip';

function parseIds(value: string | null): string[] {
	return (value ?? '').split(',').map((s) => s.trim()).filter((s) => /^[A-Za-z0-9_-]{6,32}$/.test(s)).slice(0, 200);
}

export const GET: RequestHandler = (event) => {
	const ids = parseIds(event.url.searchParams.get('ids'));
	if (ids.length === 0) throw error(400, st(event.locals.lang, 'err.notFound'));
	const marks = ids.map(() => '?').join(',');
	const rows = db.prepare(
		`SELECT m.*, g.name AS guest_name FROM media m JOIN guests g ON g.id = m.guest_id
		 WHERE m.id IN (${marks}) AND m.status = 'ready' ORDER BY m.created_at`
	).all(...ids) as ZipRow[];
	if (rows.length === 0) throw error(404, st(event.locals.lang, 'err.notReady'));
	return zipResponse(rows, `wedding-${new Date().toISOString().slice(0, 10)}-${rows.length}.zip`, false);
};
