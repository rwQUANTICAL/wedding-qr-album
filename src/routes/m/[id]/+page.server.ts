import { error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { db } from '$lib/server/db';
import { getMedia, listComments } from '$lib/server/media';
import { st } from '$lib/server/i18n';

function neighbor(createdAt: string, id: string, direction: 'older' | 'newer'): string | null {
	const sql =
		direction === 'older'
			? `SELECT id FROM media WHERE status = 'ready' AND (created_at < ? OR (created_at = ? AND id < ?)) ORDER BY created_at DESC, id DESC LIMIT 1`
			: `SELECT id FROM media WHERE status = 'ready' AND (created_at > ? OR (created_at = ? AND id > ?)) ORDER BY created_at ASC, id ASC LIMIT 1`;
	const row = db.prepare(sql).get(createdAt, createdAt, id) as { id: string } | undefined;
	return row?.id ?? null;
}

export const load: PageServerLoad = ({ params, locals }) => {
	const viewer = locals.guest?.id ?? null;
	const item = getMedia(params.id, viewer);
	if (!item) throw error(404, st(locals.lang, 'err.slideGone'));
	return {
		item,
		comments: listComments(params.id, viewer),
		prevId: neighbor(item.createdAt, item.id, 'newer'),
		nextId: neighbor(item.createdAt, item.id, 'older')
	};
};
