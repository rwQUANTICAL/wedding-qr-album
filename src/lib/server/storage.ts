import fs from 'node:fs';
import path from 'node:path';
import { MEDIA_DIR } from './env';

export type Variant = 'original' | 'web' | 'card' | 'thumb' | 'video' | 'poster';

const FILES: Record<Variant, string> = {
	original: 'original.jpg',
	web: 'web.webp',
	card: 'card.webp',
	thumb: 'thumb.webp',
	video: 'video.mp4',
	poster: 'poster.webp'
};

export const CONTENT_TYPES: Record<Variant, string> = {
	original: 'image/jpeg',
	web: 'image/webp',
	card: 'image/webp',
	thumb: 'image/webp',
	video: 'video/mp4',
	poster: 'image/webp'
};

export function mediaDir(id: string): string {
	return path.join(MEDIA_DIR, id);
}

export function variantPath(id: string, variant: Variant): string {
	return path.join(mediaDir(id), FILES[variant]);
}

export function rawPath(id: string, ext: string): string {
	return path.join(mediaDir(id), `raw.${ext}`);
}

export function ensureMediaDir(id: string): string {
	const dir = mediaDir(id);
	fs.mkdirSync(dir, { recursive: true });
	return dir;
}

export function removeMediaDir(id: string): void {
	fs.rmSync(mediaDir(id), { recursive: true, force: true });
}

export function avatarPath(guestId: string): string {
	return path.join(MEDIA_DIR, 'avatars', `${guestId}.webp`);
}

export function ensureAvatarDir(): void {
	fs.mkdirSync(path.join(MEDIA_DIR, 'avatars'), { recursive: true });
}

export function isVariant(value: string): value is Variant {
	return value in FILES;
}

export function couplePhotoPath(): string {
	return path.join(MEDIA_DIR, 'branding', 'couple.webp');
}

export function ensureBrandingDir(): void {
	fs.mkdirSync(path.join(MEDIA_DIR, 'branding'), { recursive: true });
}
