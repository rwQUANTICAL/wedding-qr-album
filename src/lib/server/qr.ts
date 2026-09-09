import QRCode from 'qrcode';
import { env } from '$env/dynamic/private';

export function inviteUrl(origin: string): string {
	return `${(env.PUBLIC_BASE_URL ?? origin).replace(/\/$/, '')}/`;
}

export function qrSvg(url: string, dark = '#1b2a28'): Promise<string> {
	return QRCode.toString(url, { type: 'svg', margin: 1, color: { dark, light: '#0000' } });
}

export function qrPng(url: string, size = 2048): Promise<Buffer> {
	return QRCode.toBuffer(url, { type: 'png', width: size, margin: 2, color: { dark: '#1b2a28', light: '#ffffff' } });
}
