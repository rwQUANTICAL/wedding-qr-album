/** Gemeinsame Grenzen für Client-Vorprüfung und Server-Validierung. */
export const LIMITS = {
	photoBytes: 30 * 1024 * 1024,
	videoBytes: 200 * 1024 * 1024,
	videoSeconds: 60,
	captionChars: 200,
	commentChars: 500,
	nameChars: 40,
	titleChars: 60
} as const;
