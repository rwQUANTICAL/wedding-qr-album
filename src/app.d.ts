import type { Guest } from '$lib/server/db';
import type { Lang } from '$lib/i18n/messages';

declare global {
	namespace App {
		interface Locals {
			guest: Guest | null;
			lang: Lang;
			isAdmin: boolean;
		}
	}
}

export {};
