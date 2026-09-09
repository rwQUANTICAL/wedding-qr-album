import { env } from '$env/dynamic/private';
import { db } from './db';
import { LIMITS } from '$lib/limits';

export interface Branding {
	/** Name im Kopf der App. */
	eventTitle: string;
	/** 0 = kein Paarfoto hinterlegt, sonst Zählerstand für den Cache-Bust. */
	photoVersion: number;
	/** Erst-Einrichtung abgeschlossen. */
	setupDone: boolean;
}

const FALLBACK_TITLE = 'Our Wedding';

function read(key: string): string | null {
	const row = db.prepare('SELECT value FROM settings WHERE key = ?').get(key) as
		{ value: string } | undefined;
	return row?.value ?? null;
}

function write(key: string, value: string): void {
	db.prepare(
		'INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value'
	).run(key, value);
}

/** Reihenfolge: gespeicherte Einstellung, dann EVENT_TITLE aus der Umgebung, dann ein neutraler Titel. */
export function branding(): Branding {
	return {
		eventTitle: read('event_title') ?? env.EVENT_TITLE?.trim() ?? FALLBACK_TITLE,
		photoVersion: Number(read('couple_photo') ?? 0),
		setupDone: read('setup_done') === '1'
	};
}

export function setEventTitle(title: string): string {
	const clean = title.trim().slice(0, LIMITS.titleChars);
	write('event_title', clean);
	return clean;
}

export function bumpCouplePhoto(): number {
	const next = Number(read('couple_photo') ?? 0) + 1;
	write('couple_photo', String(next));
	return next;
}

export function clearCouplePhoto(): void {
	write('couple_photo', '0');
}

export function completeSetup(): void {
	write('setup_done', '1');
}
