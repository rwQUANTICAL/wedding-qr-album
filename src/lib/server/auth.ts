import { createHmac, randomBytes, timingSafeEqual } from 'node:crypto';
import type { Cookies } from '@sveltejs/kit';
import { secrets } from './env';
import { db, type Guest } from './db';

const YEAR = 60 * 60 * 24 * 365;
const COOKIE = { path: '/', httpOnly: true, sameSite: 'lax' as const, secure: false, maxAge: YEAR };

export const GUEST_COOKIE = 'wp_guest';
export const ADMIN_COOKIE = 'wp_admin';

function sign(value: string): string {
	return createHmac('sha256', secrets.cookieSecret).update(value).digest('base64url');
}

function seal(value: string): string {
	return `${value}.${sign(value)}`;
}

function unseal(sealed: string | undefined): string | null {
	if (!sealed) return null;
	const dot = sealed.lastIndexOf('.');
	if (dot < 1) return null;
	const value = sealed.slice(0, dot);
	const given = Buffer.from(sealed.slice(dot + 1));
	const expected = Buffer.from(sign(value));
	if (given.length !== expected.length || !timingSafeEqual(given, expected)) return null;
	return value;
}

function safeEqual(a: string, b: string): boolean {
	const ab = Buffer.from(a);
	const bb = Buffer.from(b);
	return ab.length === bb.length && timingSafeEqual(ab, bb);
}

export function newId(): string {
	return randomBytes(9).toString('base64url');
}

export function grantAdmin(cookies: Cookies, key: string | null): boolean {
	if (key && safeEqual(key, secrets.adminKey)) {
		cookies.set(ADMIN_COOKIE, seal('admin'), COOKIE);
		return true;
	}
	return unseal(cookies.get(ADMIN_COOKIE)) === 'admin';
}

export function loadGuest(cookies: Cookies): Guest | null {
	const id = unseal(cookies.get(GUEST_COOKIE));
	if (!id) return null;
	return db.prepare('SELECT * FROM guests WHERE id = ?').get(id) as Guest | undefined ?? null;
}

export function createGuest(cookies: Cookies, name: string): Guest {
	const id = newId();
	db.prepare('INSERT INTO guests (id, name) VALUES (?, ?)').run(id, name);
	cookies.set(GUEST_COOKIE, seal(id), COOKIE);
	return db.prepare('SELECT * FROM guests WHERE id = ?').get(id) as Guest;
}

/** Persönlicher Wiederherstellungs-Token; wird beim ersten Bedarf erzeugt. */
export function recoveryToken(guest: Guest): string {
	if (guest.recovery_token) return guest.recovery_token;
	const token = randomBytes(18).toString('base64url');
	db.prepare('UPDATE guests SET recovery_token = ? WHERE id = ?').run(token, guest.id);
	guest.recovery_token = token;
	return token;
}

export function guestByRecoveryToken(token: string): Guest | null {
	if (!/^[A-Za-z0-9_-]{16,64}$/.test(token)) return null;
	return (db.prepare('SELECT * FROM guests WHERE recovery_token = ?').get(token) as Guest | undefined) ?? null;
}

export function loginGuest(cookies: Cookies, guest: Guest): void {
	cookies.set(GUEST_COOKIE, seal(guest.id), COOKIE);
}

export function renameGuest(guest: Guest, name: string): Guest {
	db.prepare('UPDATE guests SET name = ? WHERE id = ?').run(name, guest.id);
	return { ...guest, name };
}
