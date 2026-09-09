const cache = new Map<string, Intl.DateTimeFormat>();

function fmt(locale: string, opts: Intl.DateTimeFormatOptions): Intl.DateTimeFormat {
	const key = locale + JSON.stringify(opts);
	let f = cache.get(key);
	if (!f) {
		f = new Intl.DateTimeFormat(locale, opts);
		cache.set(key, f);
	}
	return f;
}

export function parseDbDate(value: string): Date {
	return value.includes('T') ? new Date(value) : new Date(value.replace(' ', 'T') + 'Z');
}

export function formatTime(value: string, locale: string): string {
	return fmt(locale, { hour: '2-digit', minute: '2-digit' }).format(parseDbDate(value));
}

export function formatDayTime(value: string, locale: string): string {
	return fmt(locale, { weekday: 'short', hour: '2-digit', minute: '2-digit' }).format(parseDbDate(value));
}

export function hourKey(value: string): string {
	const d = parseDbDate(value);
	return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}-${d.getHours()}`;
}

export function hourLabel(value: string, locale: string): string {
	const d = parseDbDate(value);
	const sameDay = d.toDateString() === new Date().toDateString();
	const label = fmt(locale, { hour: '2-digit', minute: '2-digit' }).format(d);
	return sameDay ? label : `${fmt(locale, { weekday: 'long' }).format(d)}, ${label}`;
}

export function formatDuration(seconds: number | null): string {
	if (seconds == null) return '';
	const s = Math.round(seconds);
	return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}
