import type { Variant } from '$lib/server/storage';

export function avatarUrl(guest: { id: string; avatar: number }): string | null {
	return guest.avatar > 0 ? `/api/avatar/${guest.id}?v=${guest.avatar}` : null;
}

export function fileUrl(item: { id: string; version: number }, variant: Variant, download = false): string {
	const q = download ? `?download&v=${item.version}` : `?v=${item.version}`;
	return `/api/media/${item.id}/file/${variant}${q}`;
}
