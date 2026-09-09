<script lang="ts">
	import { invalidateAll } from '$app/navigation';
	import Gallery from '$lib/components/Gallery.svelte';
	import Icon from '$lib/components/Icon.svelte';
	import { i18n } from '$lib/i18n/index.svelte';
	import { uploads } from '$lib/upload.svelte';
	import type { MediaView } from '$lib/server/media';

	let { data } = $props();
	const t = i18n.t;

	let extra = $state<MediaView[]>([]);
	let loadingMore = $state(false);
	let exhausted = $state(false);

	const all = $derived([...data.items, ...extra.filter((e) => !data.items.some((i) => i.id === e.id))]);

	$effect(() => {
		const timer = setInterval(() => {
			if (!document.hidden && navigator.onLine) void invalidateAll();
		}, 20000);
		return () => clearInterval(timer);
	});

	async function loadMore(): Promise<void> {
		const last = all[all.length - 1];
		if (!last || loadingMore) return;
		loadingMore = true;
		const res = await fetch(`/api/media?before=${encodeURIComponent(last.createdAt)}&limit=80`);
		const { items } = (await res.json()) as { items: MediaView[] };
		extra = [...extra, ...items];
		exhausted = items.length < 80;
		loadingMore = false;
	}

	function canDelete(items: MediaView[]): boolean {
		return data.isAdmin || items.every((i) => i.mine);
	}
</script>

{#if all.length === 0}
	<section class="empty">
		<button class="card" onclick={() => uploads.openPicker()} aria-label={t('upload.aria.idle')}>
			<span class="frame">
				<Icon name="upload" size={34} />
				<span>{t('feed.emptySlide')}</span>
			</span>
		</button>
		<h1>{t('feed.emptyTitle')}</h1>
		<p>{t('feed.emptyText')}</p>
	</section>
{:else}
	<section class="feed">
		<Gallery items={all} title={t('feed.title')} {canDelete} canLike={!!data.guest} />

		{#if !exhausted && all.length >= 80}
			<div class="more">
				<button class="pill pill--soft" onclick={loadMore} disabled={loadingMore}>{loadingMore ? t('feed.loading') : t('feed.more')}</button>
			</div>
		{/if}
	</section>
{/if}

<style>
	.feed {
		max-width: 1400px;
		margin: 0 auto;
		padding: 1rem 0.75rem 0;
	}

	@media (min-width: 640px) {
		.feed { padding: 1.25rem 1.25rem 0; }
	}

	.empty {
		min-height: 70dvh;
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		text-align: center;
		padding: 2rem 1.25rem;
	}

	.empty .card {
		display: block;
		width: min(78vw, 360px);
		aspect-ratio: 3 / 2;
		padding: 10px;
		transition: transform var(--t-fast) var(--ease-out), box-shadow var(--t-fast) var(--ease-out);
	}

	.empty .card:hover {
		transform: translateY(-2px);
		box-shadow: var(--shadow-card-hover);
	}

	.empty .card:active {
		transform: scale(0.985);
	}

	.empty .frame {
		height: 100%;
		border-radius: var(--r-img);
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		gap: 0.5rem;
		background: var(--teal-soft);
		color: var(--teal-deep);
		font-size: var(--fs-2);
		font-weight: 700;
	}

	.empty h1 {
		margin-top: 1.5rem;
		font-size: var(--fs-5);
		font-weight: 700;
		max-width: 22ch;
	}

	.empty p {
		margin-top: 0.5rem;
		max-width: 34ch;
		color: var(--ink-70);
	}

	.more {
		display: flex;
		justify-content: center;
		padding: 1.5rem 0 0.5rem;
	}
</style>
