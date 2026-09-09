import { env } from '$env/dynamic/private';
import path from 'node:path';

function required(name: string): string {
	const value = env[name];
	if (!value) throw new Error(`Umgebungsvariable ${name} fehlt`);
	return value;
}

export const DATA_DIR = path.resolve(env.DATA_DIR ?? './data');
export const MEDIA_DIR = path.join(DATA_DIR, 'media');
export const DB_PATH = path.join(DATA_DIR, 'db', 'wedding.sqlite');
// Lazy, damit `vite build` ohne .env durchläuft; geprüft wird beim ersten Request.
export const secrets = {
	get adminKey(): string {
		return required('ADMIN_KEY');
	},
	get cookieSecret(): string {
		return required('COOKIE_SECRET');
	}
};

export { LIMITS } from '$lib/limits';
