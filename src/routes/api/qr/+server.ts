import type { RequestHandler } from './$types';
import { requireAdmin } from '$lib/server/guard';
import { inviteUrl, qrPng, qrSvg } from '$lib/server/qr';

export const GET: RequestHandler = async (event) => {
	requireAdmin(event);
	const url = inviteUrl(event.url.origin);
	const format = event.url.searchParams.get('format') === 'svg' ? 'svg' : 'png';
	if (format === 'svg') {
		const svg = await qrSvg(url);
		return new Response(svg, {
			headers: { 'content-type': 'image/svg+xml', 'content-disposition': 'attachment; filename="wedding-qr.svg"' }
		});
	}
	const png = await qrPng(url);
	return new Response(new Uint8Array(png), {
		headers: { 'content-type': 'image/png', 'content-disposition': 'attachment; filename="wedding-qr.png"' }
	});
};
