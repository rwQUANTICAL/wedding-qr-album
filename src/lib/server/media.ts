import { db, type CommentRow, type Crop, type Guest, type MediaKind, type MediaRow } from './db';
import { newId, recoveryToken } from './auth';
import { avatarPath, removeMediaDir } from './storage';
import fs from 'node:fs';

export interface GuestRef {
	id: string;
	name: string;
	avatar: number;
}

export interface MediaView {
	id: string;
	kind: MediaKind;
	status: MediaRow['status'];
	caption: string | null;
	width: number | null;
	height: number | null;
	duration: number | null;
	createdAt: string;
	takenAt: string | null;
	guest: GuestRef;
	likes: number;
	likedByMe: boolean;
	comments: number;
	mine: boolean;
	error: string | null;
	version: number;
}

export interface CommentView {
	id: string;
	text: string;
	createdAt: string;
	guest: GuestRef;
	mine: boolean;
}

type JoinedRow = MediaRow & {
	guest_name: string;
	guest_avatar: number;
	like_count: number;
	comment_count: number;
	liked_by_me: number;
};

const SELECT = `
	SELECT m.*, g.name AS guest_name, g.avatar AS guest_avatar,
		(SELECT COUNT(*) FROM likes l WHERE l.media_id = m.id) AS like_count,
		(SELECT COUNT(*) FROM comments c WHERE c.media_id = m.id) AS comment_count,
		EXISTS(SELECT 1 FROM likes l WHERE l.media_id = m.id AND l.guest_id = @viewer) AS liked_by_me
	FROM media m JOIN guests g ON g.id = m.guest_id`;

function toView(row: JoinedRow, viewerId: string | null): MediaView {
	return {
		id: row.id,
		kind: row.kind,
		status: row.status,
		caption: row.caption,
		width: row.width,
		height: row.height,
		duration: row.duration_s,
		createdAt: row.created_at,
		takenAt: row.taken_at,
		guest: { id: row.guest_id, name: row.guest_name, avatar: row.guest_avatar },
		likes: row.like_count,
		likedByMe: row.liked_by_me === 1,
		comments: row.comment_count,
		mine: row.guest_id === viewerId,
		error: row.status === 'failed' ? row.error : null,
		version: row.version
	};
}

export function listMedia(viewerId: string | null, opts: { mine?: boolean; before?: string; limit?: number } = {}): MediaView[] {
	const limit = Math.min(opts.limit ?? 60, 200);
	const where: string[] = [];
	if (opts.mine) where.push('m.guest_id = @viewer');
	else where.push("(m.status = 'ready' OR m.guest_id = @viewer)");
	if (opts.before) where.push('m.created_at < @before');
	const sql = `${SELECT} WHERE ${where.join(' AND ')} ORDER BY m.created_at DESC, m.id DESC LIMIT @limit`;
	const rows = db.prepare(sql).all({ viewer: viewerId, before: opts.before ?? null, limit }) as JoinedRow[];
	return rows.map((r) => toView(r, viewerId));
}

export function getMedia(id: string, viewerId: string | null): MediaView | null {
	const row = db.prepare(`${SELECT} WHERE m.id = @id`).get({ id, viewer: viewerId }) as JoinedRow | undefined;
	return row ? toView(row, viewerId) : null;
}

export function getMediaRow(id: string): MediaRow | null {
	return (db.prepare('SELECT * FROM media WHERE id = ?').get(id) as MediaRow | undefined) ?? null;
}

export function createMedia(guest: Guest, kind: MediaKind, rawExt: string): string {
	const id = newId();
	db.prepare('INSERT INTO media (id, guest_id, kind, raw_ext) VALUES (?, ?, ?, ?)').run(id, guest.id, kind, rawExt);
	return id;
}

export function updateCaption(id: string, caption: string | null): void {
	db.prepare('UPDATE media SET caption = ? WHERE id = ?').run(caption, id);
}

export function updateEdits(id: string, rotation: number, crop: Crop | null): void {
	db.prepare("UPDATE media SET rotation = ?, crop = ?, status = 'processing', error = NULL, version = version + 1 WHERE id = ?")
		.run(rotation, crop ? JSON.stringify(crop) : null, id);
}

export function deleteMedia(id: string): void {
	db.prepare('DELETE FROM media WHERE id = ?').run(id);
	removeMediaDir(id);
}

export function setLike(mediaId: string, guestId: string, liked: boolean | null): { liked: boolean; likes: number } {
	const existing = !!db.prepare('SELECT 1 FROM likes WHERE media_id = ? AND guest_id = ?').get(mediaId, guestId);
	const target = liked ?? !existing;
	if (target && !existing) db.prepare('INSERT INTO likes (media_id, guest_id) VALUES (?, ?)').run(mediaId, guestId);
	if (!target && existing) db.prepare('DELETE FROM likes WHERE media_id = ? AND guest_id = ?').run(mediaId, guestId);
	const { n } = db.prepare('SELECT COUNT(*) AS n FROM likes WHERE media_id = ?').get(mediaId) as { n: number };
	return { liked: target, likes: n };
}

export function listComments(mediaId: string, viewerId: string | null): CommentView[] {
	const rows = db.prepare(
		`SELECT c.*, g.name AS guest_name, g.avatar AS guest_avatar FROM comments c JOIN guests g ON g.id = c.guest_id
		 WHERE c.media_id = ? ORDER BY c.created_at ASC, c.id ASC`
	).all(mediaId) as (CommentRow & { guest_name: string; guest_avatar: number })[];
	return rows.map((r) => ({
		id: r.id,
		text: r.text,
		createdAt: r.created_at,
		guest: { id: r.guest_id, name: r.guest_name, avatar: r.guest_avatar },
		mine: r.guest_id === viewerId
	}));
}

export function addComment(mediaId: string, guest: Guest, text: string): CommentView {
	const id = newId();
	db.prepare('INSERT INTO comments (id, media_id, guest_id, text) VALUES (?, ?, ?, ?)').run(id, mediaId, guest.id, text);
	const row = db.prepare('SELECT * FROM comments WHERE id = ?').get(id) as CommentRow;
	return { id, text, createdAt: row.created_at, guest: { id: guest.id, name: guest.name, avatar: guest.avatar }, mine: true };
}

export function deleteComment(commentId: string, guestId: string, isAdmin: boolean): boolean {
	const sql = isAdmin
		? 'DELETE FROM comments WHERE id = ?'
		: 'DELETE FROM comments WHERE id = ? AND guest_id = ?';
	const result = isAdmin ? db.prepare(sql).run(commentId) : db.prepare(sql).run(commentId, guestId);
	return result.changes > 0;
}

export function stats(): { photos: number; videos: number; guests: number } {
	const photos = (db.prepare("SELECT COUNT(*) AS n FROM media WHERE kind = 'photo' AND status = 'ready'").get() as { n: number }).n;
	const videos = (db.prepare("SELECT COUNT(*) AS n FROM media WHERE kind = 'video' AND status = 'ready'").get() as { n: number }).n;
	const guests = (db.prepare('SELECT COUNT(*) AS n FROM guests').get() as { n: number }).n;
	return { photos, videos, guests };
}

export interface GuestView {
	id: string;
	name: string;
	createdAt: string;
	isAdmin: boolean;
	avatar: number;
	recoveryToken: string;
	photos: number;
	videos: number;
	comments: number;
}

export function listGuests(): GuestView[] {
	const rows = db.prepare(
		`SELECT g.id, g.name, g.created_at, g.is_admin, g.avatar, g.recovery_token,
			(SELECT COUNT(*) FROM media m WHERE m.guest_id = g.id AND m.kind = 'photo') AS photos,
			(SELECT COUNT(*) FROM media m WHERE m.guest_id = g.id AND m.kind = 'video') AS videos,
			(SELECT COUNT(*) FROM comments c WHERE c.guest_id = g.id) AS comments
		 FROM guests g ORDER BY g.created_at DESC`
	).all() as (Guest & { photos: number; videos: number; comments: number })[];
	return rows.map((r) => ({ id: r.id, name: r.name, createdAt: r.created_at, isAdmin: r.is_admin === 1, avatar: r.avatar, recoveryToken: recoveryToken(r), photos: r.photos, videos: r.videos, comments: r.comments }));
}

export function setGuestAdmin(id: string, isAdmin: boolean): boolean {
	return db.prepare('UPDATE guests SET is_admin = ? WHERE id = ?').run(isAdmin ? 1 : 0, id).changes > 0;
}

export function deleteGuest(id: string): boolean {
	const media = db.prepare('SELECT id FROM media WHERE guest_id = ?').all(id) as { id: string }[];
	for (const m of media) deleteMedia(m.id);
	db.prepare('DELETE FROM likes WHERE guest_id = ?').run(id);
	db.prepare('DELETE FROM comments WHERE guest_id = ?').run(id);
	fs.rmSync(avatarPath(id), { force: true });
	return db.prepare('DELETE FROM guests WHERE id = ?').run(id).changes > 0;
}
