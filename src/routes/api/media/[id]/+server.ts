import { error, json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { LIMITS } from '$lib/server/env';
import { readJson, requireGuest } from '$lib/server/guard';
import { deleteMedia, getMedia, getMediaRow, updateCaption, updateEdits } from '$lib/server/media';
import { enqueue } from '$lib/server/queue';
import type { Crop, MediaRow } from '$lib/server/db';
import { st } from '$lib/server/i18n';
import type { Lang } from '$lib/i18n/messages';

function ownedRow(event: Parameters<RequestHandler>[0]): MediaRow {
	const row = getMediaRow(event.params.id);
	if (!row) throw error(404, st(event.locals.lang, 'err.notFound'));
	if (event.locals.isAdmin) return row;
	const guest = requireGuest(event);
	if (row.guest_id !== guest.id) throw error(403, st(event.locals.lang, 'err.notYours'));
	return row;
}

function parseCrop(value: unknown, lang: Lang): Crop | null {
	if (value == null) return null;
	const c = value as Partial<Crop>;
	const nums = [c.x, c.y, c.w, c.h];
	if (nums.some((n) => typeof n !== 'number' || !isFinite(n))) throw error(400, st(lang, 'err.badCrop'));
	const crop = { x: c.x!, y: c.y!, w: c.w!, h: c.h! };
	if (crop.x < 0 || crop.y < 0 || crop.w <= 0.05 || crop.h <= 0.05 || crop.x + crop.w > 1.001 || crop.y + crop.h > 1.001) {
		throw error(400, st(lang, 'err.cropOutside'));
	}
	return crop;
}

export const GET: RequestHandler = (event) => {
	const item = getMedia(event.params.id, event.locals.guest?.id ?? null);
	if (!item) throw error(404, st(event.locals.lang, 'err.notFound'));
	return json({ item });
};

export const PATCH: RequestHandler = async (event) => {
	const row = ownedRow(event);
	const body = await readJson<{ caption?: string | null; rotation?: number; crop?: Crop | null }>(event);

	if ('caption' in body) {
		const caption = body.caption?.trim().slice(0, LIMITS.captionChars) || null;
		updateCaption(row.id, caption);
	}

	const wantsEdit = 'rotation' in body || 'crop' in body;
	if (wantsEdit) {
		if (row.kind !== 'photo') throw error(400, st(event.locals.lang, 'err.noVideoEdit'));
		if (!row.raw_ext) throw error(400, st(event.locals.lang, 'err.noOriginal'));
		const rotation = body.rotation ?? row.rotation;
		if (![0, 90, 180, 270].includes(rotation)) throw error(400, st(event.locals.lang, 'err.badRotation'));
		const crop = 'crop' in body ? parseCrop(body.crop, event.locals.lang) : row.crop ? (JSON.parse(row.crop) as Crop) : null;
		updateEdits(row.id, rotation, crop);
		enqueue(row.id);
	}

	return json({ item: getMedia(row.id, event.locals.guest?.id ?? null) });
};

export const DELETE: RequestHandler = (event) => {
	const row = ownedRow(event);
	deleteMedia(row.id);
	return new Response(null, { status: 204 });
};
