<script lang="ts">
	import { goto, invalidateAll } from '$app/navigation';
	import EventCard from '$lib/components/EventCard.svelte';
	import Icon from '$lib/components/Icon.svelte';
	import { i18n } from '$lib/i18n/index.svelte';

	let { data } = $props();
	const t = i18n.t;
	let leaving = $state(false);

	async function finish(): Promise<void> {
		leaving = true;
		await fetch('/api/settings', {
			method: 'PUT',
			headers: { 'content-type': 'application/json' },
			body: JSON.stringify({ setupDone: true })
		});
		await invalidateAll();
		await goto('/');
	}
</script>

<svelte:head><title>{t('setup.title')} · {data.eventTitle}</title></svelte:head>

<section class="setup">
	<header>
		<h1>{t('setup.title')}</h1>
		<p>{t('setup.lead')}</p>
	</header>

	<EventCard title={data.eventTitle} photo={data.couplePhoto} />

	<button class="pill pill--gold done" type="button" onclick={finish} disabled={leaving}>
		{t('setup.open')}
		<Icon name="back" size={18} />
	</button>
</section>

<style>
	.setup {
		max-width: 560px;
		margin: 0 auto;
		padding: 1.5rem 0.75rem 0;
		display: flex;
		flex-direction: column;
		gap: 1rem;
	}

	header {
		display: flex;
		flex-direction: column;
		gap: 0.35rem;
	}

	h1 {
		font-size: var(--fs-5);
		font-weight: 700;
	}

	header p {
		color: var(--ink-70);
	}

	.done {
		align-self: flex-start;
	}

	.done :global(svg) {
		transform: rotate(180deg);
	}
</style>
