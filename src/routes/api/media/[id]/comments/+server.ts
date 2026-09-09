import { error, json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { LIMITS } from '$lib/server/env';
import { readJson, requireGuest } from '$lib/server/guard';
import { addComment, deleteComment, getMediaRow, listComments } from '$lib/server/media';
import { st } from '$lib/server/i18n';

export const GET: RequestHandler = (event) => {
	if (!getMediaRow(event.params.id)) throw error(404, st(event.locals.lang, 'err.notFound'));
	return json({ comments: listComments(event.params.id, event.locals.guest?.id ?? null) });
};

export const POST: RequestHandler = async (event) => {
	const guest = requireGuest(event);
	if (!getMediaRow(event.params.id)) throw error(404, st(event.locals.lang, 'err.notFound'));
	const body = await readJson<{ text?: string }>(event);
	const text = (body.text ?? '').trim().slice(0, LIMITS.commentChars);
	if (!text) throw error(400, st(event.locals.lang, 'err.emptyComment'));
	return json({ comment: addComment(event.params.id, guest, text) }, { status: 201 });
};

export const DELETE: RequestHandler = async (event) => {
	const guest = requireGuest(event);
	const body = await readJson<{ commentId?: string }>(event);
	if (!body.commentId) throw error(400, st(event.locals.lang, 'err.commentId'));
	const removed = deleteComment(body.commentId, guest.id, event.locals.isAdmin);
	if (!removed) throw error(404, st(event.locals.lang, 'err.commentNotFound'));
	return new Response(null, { status: 204 });
};
