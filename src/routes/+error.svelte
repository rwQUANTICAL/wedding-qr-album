<script lang="ts">
	import { page } from '$app/state';
	import { i18n } from '$lib/i18n/index.svelte';

	const t = i18n.t;
</script>

<section class="err">
	<div class="mount">
		<p class="code num">{page.status}</p>
		<h1>{page.error?.message ?? t('error.generic')}</h1>
		<a class="pill pill--gold" href="/">{t('error.home')}</a>
	</div>
</section>

<style>
	.err {
		min-height: 70dvh;
		display: grid;
		place-items: center;
		padding: 2rem 1.25rem;
		text-align: center;
	}

	.mount {
		max-width: 36ch;
		padding: 1.5rem 1.4rem;
		border-radius: var(--r-card);
		background: var(--card);
		color: var(--ink);
		box-shadow: var(--shadow-card);
	}

	.code {
		font-size: var(--fs-1);
		font-weight: 700;
		letter-spacing: 0.1em;
		color: var(--ink-55);
	}

	h1 {
		margin: 0.4rem 0 1rem;
		font-size: var(--fs-4);
		font-weight: 700;
	}
</style>
