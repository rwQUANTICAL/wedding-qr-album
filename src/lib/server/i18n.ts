import type { Cookies } from '@sveltejs/kit';
import { DEFAULT_LANG, isLang, translate, type Key, type Lang } from '$lib/i18n/messages';

export const LANG_COOKIE = 'wp_lang';

export function readLang(cookies: Cookies): Lang {
	const value = cookies.get(LANG_COOKIE);
	return isLang(value) ? value : DEFAULT_LANG;
}

export function st(lang: Lang, key: Key, vars?: Record<string, string | number>): string {
	return translate(lang, key, vars);
}
