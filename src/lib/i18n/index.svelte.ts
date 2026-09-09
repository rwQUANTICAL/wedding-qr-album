import { DEFAULT_LANG, LANGS, translate, type Key, type Lang } from './messages';

class I18n {
	lang = $state<Lang>(DEFAULT_LANG);

	get locale(): string {
		return LANGS.find((l) => l.code === this.lang)?.locale ?? 'en-GB';
	}

	t = (key: Key, vars?: Record<string, string | number>): string => translate(this.lang, key, vars);

	n = (base: 'count.photo' | 'count.video' | 'count.guest', n: number): string =>
		translate(this.lang, n === 1 ? base : (`${base}s` as Key), { n });

	kind = (kind: 'photo' | 'video', capital = false): string =>
		translate(this.lang, capital ? (kind === 'photo' ? 'kind.Photo' : 'kind.Video') : kind === 'photo' ? 'kind.photo' : 'kind.video');
}

export const i18n = new I18n();

export function setLangCookie(lang: Lang): void {
	document.cookie = `wp_lang=${lang}; path=/; max-age=31536000; samesite=lax`;
}
