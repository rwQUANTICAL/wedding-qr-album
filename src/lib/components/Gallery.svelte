<script lang="ts">
	import { invalidateAll } from '$app/navigation';
	import type { MediaView } from '$lib/server/media';
	import PhotoCard from './PhotoCard.svelte';
	import ConfirmSheet from './ConfirmSheet.svelte';
	import Icon from './Icon.svelte';
	import { i18n } from '$lib/i18n/index.svelte';
	import { selection } from '$lib/selection.svelte';

	interface Props {
		items: MediaView[];
		title: string;
		subtitle?: string;
		canDelete: (items: MediaView[]) => boolean;
		canLike?: boolean;
	}

	let { items, title, subtitle, canDelete, canLike = true }: Props = $props();
	const t = i18n.t;

	let confirming = $state(false);
	let busy = $state(false);
	let width = $state(0);

	const columnCount = $derived(width >= 1440 ? 5 : width >= 1024 ? 4 : width >= 640 ? 3 : 2);

	// Verteilt Karten auf die jeweils kürzeste Spalte; Höhe = Bild (Seitenverhältnis) + Fußzeile.
	const columns = $derived.by(() => {
		const cols: MediaView[][] = Array.from({ length: columnCount }, () => []);
		const heights = new Array<number>(columnCount).fill(0);
		for (const item of items) {
			const ratio = (item.width ?? 4) / (item.height ?? 3);
			const h = 1 / ratio + 0.32;
			let target = 0;
			for (let c = 1; c < columnCount; c++) if (heights[c] < heights[target] - 0.01) target = c;
			cols[target].push(item);
			heights[target] += h;
		}
		return cols;
	});

	const selectedItems = $derived(items.filter((i) => selection.has(i.id)));
	const deletable = $derived(selectedItems.length > 0 && canDelete(selectedItems));
	const downloadable = $derived(selectedItems.filter((i) => i.status === 'ready'));

	$effect(() => () => selection.stop());

	function downloadUrl(): string {
		return `/api/download?ids=${downloadable.map((i) => i.id).join(',')}`;
	}

	async function removeSelected(): Promise<void> {
		busy = true;
		await fetch('/api/media', {
			method: 'DELETE',
			headers: { 'content-type': 'application/json' },
			body: JSON.stringify({ ids: selectedItems.map((i) => i.id) })
		});
		busy = false;
		confirming = false;
		selection.stop();
		await invalidateAll();
	}
</script>

<div class="head">
	<div>
		<h1>{title}</h1>
		{#if subtitle}<p class="sub num">{subtitle}</p>{/if}
	</div>
	{#if items.length > 0}
		{#if selection.active}
			<button class="pill pill--soft" onclick={() => selection.stop()}>{t('select.cancel')}</button>
		{:else}
			<button class="pill pill--soft" onclick={() => selection.start()}><Icon name="check" size={16} /> {t('select.start')}</button>
		{/if}
	{/if}
</div>

{#if selection.active}
	<p class="hint">{t('select.hint')}</p>
{/if}

<div class="masonry" bind:clientWidth={width} style:--cols={columnCount}>
	{#each columns as column, c (c)}
		<div class="column">
			{#each column as item (item.id)}
				<PhotoCard {item} eager={c < columnCount && column.indexOf(item) < 2} {canLike} sizes={`${Math.round(100 / columnCount)}vw`} />
			{/each}
		</div>
	{/each}
</div>

{#if selection.active}
	<div class="bar" role="toolbar" aria-label={t('select.count', { n: selection.count })}>
		<span class="count num">{t('select.count', { n: selection.count })}</span>
		<div class="actions">
			<a class="pill pill--ink" class:disabled={downloadable.length === 0} href={downloadable.length ? downloadUrl() : undefined} aria-disabled={downloadable.length === 0}>
				<Icon name="download" size={18} /> {t('select.download')}
			</a>
			{#if deletable}
				<button class="pill pill--coral" onclick={() => (confirming = true)}><Icon name="trash" size={18} /> {t('select.delete')}</button>
			{/if}
		</div>
	</div>
{/if}

{#if confirming}
	<ConfirmSheet text={t('select.confirm', { n: selectedItems.length })} yes={t('viewer.confirmYes')} no={t('viewer.confirmNo')} {busy} onyes={removeSelected} onno={() => (confirming = false)} />
{/if}

<style>
	.head {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 1rem;
		margin-bottom: 0.9rem;
	}

	h1 {
		font-size: var(--fs-5);
		font-weight: 700;
	}

	.sub {
		margin-top: 0.1rem;
		font-size: var(--fs-2);
		color: var(--ink-55);
	}

	.hint {
		margin: -0.3rem 0 0.8rem;
		font-size: var(--fs-2);
		color: var(--ink-55);
	}

	.masonry {
		display: grid;
		grid-template-columns: repeat(var(--cols, 2), minmax(0, 1fr));
		gap: 0.75rem;
		align-items: start;
	}

	.column {
		display: flex;
		flex-direction: column;
		gap: 0.75rem;
		min-width: 0;
	}

	@media (min-width: 640px) {
		.masonry,
		.column {
			gap: 1rem;
		}
	}

	.bar {
		position: fixed;
		left: 0;
		right: 0;
		bottom: 0;
		z-index: 25;
		display: flex;
		align-items: center;
		justify-content: space-between;
		flex-wrap: wrap;
		gap: 0.5rem 0.75rem;
		padding: 0.75rem 1rem calc(0.75rem + var(--safe-bottom));
		background: var(--card);
		box-shadow: var(--shadow-sheet);
	}

	.count {
		font-weight: 700;
		white-space: nowrap;
	}

	.actions {
		display: flex;
		gap: 0.5rem;
		margin-left: auto;
	}

	.pill.disabled {
		opacity: 0.4;
		pointer-events: none;
	}
</style>
