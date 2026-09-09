import type { MediaView } from '$lib/server/media';

/**
 * Optimistischer Like-Zustand für ein Medium, auf Karte und in der Vollbildansicht identisch.
 * Sendet den gewünschten Zustand statt eines Toggles und wertet nur die jüngste Antwort aus,
 * damit schnelle Doppeltipps und parallele Anfragen nicht durcheinandergeraten.
 */
export class LikeState {
	liked = $state(false);
	count = $state(0);
	pop = $state(false);
	private id = '';
	private pending = 0;

	sync(item: MediaView): void {
		if (this.id === item.id && this.pending > 0) return;
		this.id = item.id;
		this.liked = item.likedByMe;
		this.count = item.likes;
	}

	toggle(): void {
		const wanted = !this.liked;
		this.liked = wanted;
		this.count = Math.max(0, this.count + (wanted ? 1 : -1));
		this.pop = wanted;
		setTimeout(() => (this.pop = false), 400);
		this.wanted = wanted;
		if (!this.inflight) this.inflight = this.flush();
	}

	private wanted: boolean | null = null;
	private inflight: Promise<void> | null = null;

	/** Sendet Anfragen nacheinander; mehrere Tipps während einer Anfrage werden zu einer zusammengefasst. */
	private async flush(): Promise<void> {
		this.pending++;
		try {
			while (this.wanted !== null) {
				const wanted = this.wanted;
				this.wanted = null;
				const res = await fetch(`/api/media/${this.id}/like`, {
					method: 'POST',
					headers: { 'content-type': 'application/json' },
					body: JSON.stringify({ liked: wanted })
				});
				if (!res.ok) continue;
				const r = (await res.json()) as { liked: boolean; likes: number };
				if (this.wanted === null) {
					this.liked = r.liked;
					this.count = r.likes;
				}
			}
		} catch {
			/* Verbindung weg: Anzeige bleibt optimistisch, nächster Sync vom Server korrigiert */
		} finally {
			this.pending--;
			this.inflight = null;
		}
	}
}
