import Database from 'better-sqlite3';
import fs from 'node:fs';
import path from 'node:path';
import { DB_PATH } from './env';

export type MediaKind = 'photo' | 'video';
export type MediaStatus = 'processing' | 'ready' | 'failed';

export interface Guest {
	id: string;
	name: string;
	created_at: string;
	is_admin: number;
	avatar: number;
	recovery_token: string | null;
}

export interface Crop {
	x: number;
	y: number;
	w: number;
	h: number;
}

export interface MediaRow {
	id: string;
	guest_id: string;
	kind: MediaKind;
	status: MediaStatus;
	caption: string | null;
	rotation: number;
	crop: string | null;
	raw_ext: string | null;
	width: number | null;
	height: number | null;
	duration_s: number | null;
	taken_at: string | null;
	created_at: string;
	error: string | null;
	version: number;
}

export interface CommentRow {
	id: string;
	media_id: string;
	guest_id: string;
	text: string;
	created_at: string;
}

const MIGRATIONS = [
	`CREATE TABLE IF NOT EXISTS guests (
		id TEXT PRIMARY KEY,
		name TEXT NOT NULL,
		created_at TEXT NOT NULL DEFAULT (datetime('now'))
	);
	CREATE TABLE IF NOT EXISTS media (
		id TEXT PRIMARY KEY,
		guest_id TEXT NOT NULL REFERENCES guests(id),
		kind TEXT NOT NULL,
		status TEXT NOT NULL DEFAULT 'processing',
		caption TEXT,
		rotation INTEGER NOT NULL DEFAULT 0,
		crop TEXT,
		raw_ext TEXT,
		width INTEGER,
		height INTEGER,
		duration_s REAL,
		taken_at TEXT,
		created_at TEXT NOT NULL DEFAULT (datetime('now')),
		error TEXT
	);
	CREATE INDEX IF NOT EXISTS media_created ON media(created_at DESC);
	CREATE INDEX IF NOT EXISTS media_guest ON media(guest_id);
	CREATE TABLE IF NOT EXISTS likes (
		media_id TEXT NOT NULL REFERENCES media(id) ON DELETE CASCADE,
		guest_id TEXT NOT NULL REFERENCES guests(id),
		created_at TEXT NOT NULL DEFAULT (datetime('now')),
		PRIMARY KEY (media_id, guest_id)
	);
	CREATE TABLE IF NOT EXISTS comments (
		id TEXT PRIMARY KEY,
		media_id TEXT NOT NULL REFERENCES media(id) ON DELETE CASCADE,
		guest_id TEXT NOT NULL REFERENCES guests(id),
		text TEXT NOT NULL,
		created_at TEXT NOT NULL DEFAULT (datetime('now'))
	);
	CREATE INDEX IF NOT EXISTS comments_media ON comments(media_id, created_at);
	CREATE INDEX IF NOT EXISTS comments_guest ON comments(guest_id);
	CREATE INDEX IF NOT EXISTS likes_guest ON likes(guest_id);
	CREATE TABLE IF NOT EXISTS jobs (
		id INTEGER PRIMARY KEY AUTOINCREMENT,
		media_id TEXT NOT NULL REFERENCES media(id) ON DELETE CASCADE,
		state TEXT NOT NULL DEFAULT 'queued',
		attempts INTEGER NOT NULL DEFAULT 0,
		error TEXT,
		created_at TEXT NOT NULL DEFAULT (datetime('now'))
	);
	CREATE INDEX IF NOT EXISTS jobs_state ON jobs(state, id);`,
	`CREATE TABLE IF NOT EXISTS settings (
		key TEXT PRIMARY KEY,
		value TEXT NOT NULL
	);`
];

function open(): Database.Database {
	fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });
	const db = new Database(DB_PATH);
	db.pragma('journal_mode = WAL');
	db.pragma('foreign_keys = ON');
	db.pragma('busy_timeout = 5000');
	for (const sql of MIGRATIONS) db.exec(sql);
	addColumnIfMissing(db, 'media', 'version', 'INTEGER NOT NULL DEFAULT 0');
	addColumnIfMissing(db, 'guests', 'is_admin', 'INTEGER NOT NULL DEFAULT 0');
	addColumnIfMissing(db, 'guests', 'avatar', 'INTEGER NOT NULL DEFAULT 0');
	addColumnIfMissing(db, 'guests', 'recovery_token', 'TEXT');
	db.exec('CREATE UNIQUE INDEX IF NOT EXISTS guests_recovery ON guests(recovery_token)');
	return db;
}

function addColumnIfMissing(
	db: Database.Database,
	table: string,
	column: string,
	definition: string
): void {
	const columns = db.prepare(`PRAGMA table_info(${table})`).all() as { name: string }[];
	if (columns.some((c) => c.name === column)) return;
	db.exec(`ALTER TABLE ${table} ADD COLUMN ${column} ${definition}`);
}

export const db = open();
