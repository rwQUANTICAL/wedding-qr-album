<script lang="ts">
	import { goto, invalidateAll } from '$app/navigation';
	import EventCard from '$lib/components/EventCard.svelte';
	import Icon from '$lib/components/Icon.svelte';
	import { i18n } from '$lib/i18n/index.svelte';

	let { data } = $props();
	const t = i18n.t;
	// svelte-ignore state_referenced_locally
	let name = $state(data.eventName);
	let leaving = $state(false);
	let error = $state<string | null>(null);

	async function finish(): Promise<void> {
		const value = name.trim();
		if (!value || leaving) return;
		leaving = true;
		error = null;
		const res = await fetch('/api/settings', {
			method: 'PUT',
			headers: { 'content-type': 'application/json' },
			body: JSON.stringify({ eventTitle: value })
		});
		if (!res.ok) {
			error =
				((await res.json().catch(() => ({}))) as { message?: string }).message ??
				t('profile.error');
			leaving = false;
			return;
		}
		await invalidateAll();
		await goto('/');
	}
</script>

<svelte:head><title>{t('setup.title')}</title></svelte:head>

<section class="setup">
	<header>
		<h1>{t('setup.title')}</h1>
		<p>{t('setup.lead')}</p>
	</header>

	<EventCard title={data.eventName} photo={data.couplePhoto} bind:value={name} saveButton={false} />

	<div class="foot">
		<button
			class="pill pill--gold"
			type="button"
			onclick={finish}
			disabled={!name.trim() || leaving}
		>
			{t('setup.open')}
			<Icon name="back" size={18} />
		</button>
		{#if error}<span class="err">{error}</span>{/if}
	</div>
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

	.foot {
		display: flex;
		align-items: center;
		gap: 0.75rem;
	}

	.foot :global(svg) {
		transform: rotate(180deg);
	}

	.err {
		font-size: var(--fs-1);
		color: var(--coral);
	}
</style>
