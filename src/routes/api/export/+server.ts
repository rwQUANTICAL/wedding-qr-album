import type { RequestHandler } from './$types';
import { db } from '$lib/server/db';
import { requireAdmin } from '$lib/server/guard';
import { zipResponse, type ZipRow } from '$lib/server/zip';

export const GET: RequestHandler = (event) => {
	requireAdmin(event);
	const rows = db.prepare(
		`SELECT m.*, g.name AS guest_name FROM media m JOIN guests g ON g.id = m.guest_id
		 WHERE m.status = 'ready' ORDER BY m.created_at`
	).all() as ZipRow[];
	return zipResponse(rows, `wedding-${new Date().toISOString().slice(0, 10)}.zip`, true);
};
