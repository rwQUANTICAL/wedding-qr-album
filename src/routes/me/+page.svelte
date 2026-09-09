<script lang="ts">
	import { invalidateAll } from '$app/navigation';
	import Gallery from '$lib/components/Gallery.svelte';
	import { i18n } from '$lib/i18n/index.svelte';

	let { data } = $props();
	const t = i18n.t;

	const processing = $derived(data.items.filter((i) => i.status === 'processing').length);
	const failed = $derived(data.items.filter((i) => i.status === 'failed').length);
	const ready = $derived(data.items.filter((i) => i.status === 'ready').length);
	const summary = $derived.by(() => {
		const parts = [t('me.ready', { n: ready })];
		if (processing) parts.push(t('me.processing', { n: processing }));
		if (failed) parts.push(t('me.failed', { n: failed }));
		return parts.join(', ');
	});

	$effect(() => {
		if (processing === 0) return;
		const timer = setInterval(() => void invalidateAll(), 4000);
		return () => clearInterval(timer);
	});
</script>

<svelte:head><title>{t('me.title')} · {data.eventTitle}</title></svelte:head>

<section class="me">
	{#if data.items.length === 0}
		<h1>{t('me.title')}</h1>
		<div class="empty">
			<p>{t('me.empty')}</p>
			<p class="hint">{t('me.emptyHint')}</p>
		</div>
	{:else}
		<Gallery items={data.items} title={t('me.title')} subtitle={summary} canDelete={() => true} canLike={false} />
	{/if}
</section>

<style>
	.me {
		max-width: 1400px;
		margin: 0 auto;
		padding: 1rem 0.75rem 0;
	}

	@media (min-width: 640px) {
		.me { padding: 1.25rem 1.25rem 0; }
	}

	h1 {
		font-size: var(--fs-5);
		font-weight: 700;
	}

	.empty {
		padding: 3rem 1rem;
		text-align: center;
		font-weight: 600;
	}

	.hint {
		margin-top: 0.4rem;
		font-weight: 500;
		color: var(--ink-70);
	}
</style>
