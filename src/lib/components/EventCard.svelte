<script lang="ts">
	import { invalidateAll } from '$app/navigation';
	import Icon from './Icon.svelte';
	import CoupleAvatar from './CoupleAvatar.svelte';
	import { i18n } from '$lib/i18n/index.svelte';
	import { LIMITS } from '$lib/limits';

	interface Props {
		title: string;
		photo: string | null;
	}

	let { title, photo }: Props = $props();
	const t = i18n.t;

	// svelte-ignore state_referenced_locally
	let value = $state(title);
	let busy = $state(false);
	let saved = $state(false);
	let err = $state<string | null>(null);
	let picker: HTMLInputElement;

	const dirty = $derived(value.trim() !== title && value.trim().length > 0);

	async function send(run: () => Promise<Response>): Promise<void> {
		if (busy) return;
		busy = true;
		err = null;
		try {
			const res = await run();
			if (!res.ok)
				throw new Error(((await res.json()) as { message?: string }).message ?? t('profile.error'));
			await invalidateAll();
			saved = true;
			setTimeout(() => (saved = false), 1600);
		} catch (e) {
			err = e instanceof Error ? e.message : t('profile.error');
		} finally {
			busy = false;
		}
	}

	function saveTitle(): Promise<void> {
		return send(() =>
			fetch('/api/settings', {
				method: 'PUT',
				headers: { 'content-type': 'application/json' },
				body: JSON.stringify({ eventTitle: value.trim() })
			})
		);
	}

	function upload(event: Event): Promise<void> | void {
		const file = (event.currentTarget as HTMLInputElement).files?.[0];
		if (!file) return;
		return send(() =>
			fetch('/api/branding/couple', {
				method: 'POST',
				headers: {
					'content-type': file.type || 'image/jpeg',
					'x-filename': encodeURIComponent(file.name)
				},
				body: file
			})
		);
	}

	function removePhoto(): Promise<void> {
		return send(() => fetch('/api/branding/couple', { method: 'DELETE' }));
	}
</script>

<div class="card event">
	<div class="group name">
		<span class="lbl">{t('event.couple')}</span>
		<div class="row">
			<input
				class="field compact"
				bind:value
				maxlength={LIMITS.titleChars}
				placeholder={t('event.couplePh')}
				autocapitalize="words"
				onkeydown={(e) => e.key === 'Enter' && dirty && saveTitle()}
			/>
			<button
				class="pill pill--ink small"
				type="button"
				onclick={saveTitle}
				disabled={!dirty || busy}
			>
				{t('event.save')}
			</button>
			{#if saved}<span class="ok"><Icon name="check" size={14} /> {t('event.saved')}</span>{/if}
			{#if err}<span class="err">{err}</span>{/if}
		</div>
	</div>

	<div class="group">
		<span class="lbl">{t('event.photo')}</span>
		<div class="row">
			<CoupleAvatar src={photo} size={34} />
			<button
				class="pill pill--soft small"
				type="button"
				onclick={() => picker.click()}
				disabled={busy}
			>
				<Icon name="upload" size={14} />
				{t('event.pick')}
			</button>
			{#if photo}
				<button class="pill pill--soft small" type="button" onclick={removePhoto} disabled={busy}>
					<Icon name="trash" size={14} />
					{t('event.remove')}
				</button>
			{/if}
		</div>
	</div>

	<input
		class="visually-hidden"
		bind:this={picker}
		type="file"
		accept="image/*"
		onchange={upload}
	/>
</div>

<style>
	.event {
		padding: 0.9rem 1rem;
		display: flex;
		flex-direction: column;
		gap: 0.75rem;
	}

	.group {
		display: flex;
		flex-direction: column;
		gap: 0.4rem;
		min-width: 0;
	}

	.name {
		flex: 1 1 auto;
	}

	.lbl {
		font-size: var(--fs-1);
		color: var(--ink-55);
	}

	.row {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		flex-wrap: wrap;
	}

	.name .row {
		flex-wrap: nowrap;
	}

	.compact {
		flex: 1 1 auto;
		min-width: 0;
		min-height: 34px;
		padding: 0.3rem 0.7rem;
		font-size: var(--fs-1);
	}

	.small {
		min-height: 34px;
		padding: 0 0.7rem;
		font-size: var(--fs-1);
		white-space: nowrap;
	}

	.ok,
	.err {
		display: inline-flex;
		align-items: center;
		gap: 0.25rem;
		font-size: var(--fs-1);
		white-space: nowrap;
	}

	.ok {
		font-weight: 600;
		color: var(--teal-deep);
	}

	.err {
		color: var(--coral);
	}

	@media (min-width: 720px) {
		.event {
			flex-direction: row;
			align-items: flex-start;
			gap: 1.5rem;
		}

		.group:not(.name) {
			flex: 0 0 auto;
		}
	}
</style>
