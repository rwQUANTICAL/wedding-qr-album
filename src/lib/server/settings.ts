import { env } from '$env/dynamic/private';
import { db } from './db';
import { LIMITS } from '$lib/limits';

export interface Branding {
	/** Name im Kopf der App. Leer, solange niemand einen eingetragen hat. */
	eventTitle: string;
	/** 0 = kein Paarfoto hinterlegt, sonst Zählerstand für den Cache-Bust. */
	photoVersion: number;
}

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

/** Gespeicherter Name vor EVENT_TITLE aus der Umgebung. Kein erfundener Ersatz. */
export function branding(): Branding {
	return {
		eventTitle: read('event_title') || env.EVENT_TITLE?.trim() || '',
		photoVersion: Number(read('couple_photo') ?? 0)
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
