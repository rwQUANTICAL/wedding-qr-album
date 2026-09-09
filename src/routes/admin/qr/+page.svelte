<script lang="ts">
	import { i18n } from '$lib/i18n/index.svelte';
	import Icon from '$lib/components/Icon.svelte';

	let { data } = $props();
	const t = i18n.t;
</script>

<svelte:head><title>{t('admin.qr')} · {data.eventTitle}</title></svelte:head>

<section class="sheet">
	<div class="toolbar">
		<a class="pill pill--soft" href="/admin"><Icon name="back" size={18} /> {t('viewer.back')}</a>
		<div class="row">
			<a class="pill pill--soft" href="/api/qr?format=png" download><Icon name="download" size={18} /> PNG</a>
			<a class="pill pill--soft" href="/api/qr?format=svg" download><Icon name="download" size={18} /> SVG</a>
			<button class="pill pill--ink" onclick={() => window.print()}><Icon name="qr" size={18} /> {t('admin.print')}</button>
		</div>
	</div>

	<div class="page">
		<div class="qr">{@html data.qrSvg}</div>
		<p class="title">{data.eventTitle}</p>
		<p class="url">{data.inviteUrl.replace(/^https?:\/\//, '').replace(/\/$/, '')}</p>
	</div>
</section>

<style>
	.sheet {
		max-width: 900px;
		margin: 0 auto;
		padding: 1rem 0.75rem 3rem;
	}

	.toolbar {
		display: flex;
		justify-content: space-between;
		gap: 0.5rem;
		flex-wrap: wrap;
		margin-bottom: 1.5rem;
	}

	.row {
		display: flex;
		gap: 0.5rem;
		flex-wrap: wrap;
	}

	.page {
		width: min(100%, 560px);
		margin: 0 auto;
		padding: 2.5rem 2rem;
		border-radius: var(--r-card);
		background: var(--card);
		box-shadow: var(--shadow-card);
		text-align: center;
	}

	.qr {
		width: min(100%, 360px);
		margin: 0 auto;
	}

	.qr :global(svg) {
		width: 100%;
		height: auto;
		display: block;
	}

	.title {
		margin-top: 1.5rem;
		font-size: var(--fs-5);
		font-weight: 700;
	}

	.url {
		margin-top: 0.3rem;
		font-size: var(--fs-3);
		color: var(--ink-70);
		word-break: break-all;
	}

	@media print {
		@page {
			margin: 2cm;
		}
		:global(body) {
			background: #fff !important;
		}
		:global(nav),
		.toolbar {
			display: none !important;
		}
		.sheet {
			padding: 0;
			max-width: none;
		}
		.page {
			width: 12cm;
			padding: 0;
			box-shadow: none;
			border-radius: 0;
			margin: 3cm auto 0;
		}
		.qr {
			width: 12cm;
		}
		.title {
			font-size: 20pt;
		}
		.url {
			font-size: 13pt;
		}
	}
</style>
