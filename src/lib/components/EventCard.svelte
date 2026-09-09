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
	<label class="row">
		<span class="lbl">{t('event.couple')}</span>
		<input
			class="field"
			bind:value
			maxlength={LIMITS.titleChars}
			placeholder={t('event.couplePh')}
			autocapitalize="words"
		/>
	</label>

	<div class="row">
		<span class="lbl">{t('event.photo')}</span>
		<div class="photo">
			<CoupleAvatar src={photo} size={56} />
			<div class="acts">
				<button
					class="pill pill--soft"
					type="button"
					onclick={() => picker.click()}
					disabled={busy}
				>
					<Icon name="upload" size={16} />
					{t('event.pick')}
				</button>
				{#if photo}
					<button class="pill pill--soft" type="button" onclick={removePhoto} disabled={busy}>
						<Icon name="trash" size={16} />
						{t('event.remove')}
					</button>
				{/if}
			</div>
		</div>
	</div>

	<input
		class="visually-hidden"
		bind:this={picker}
		type="file"
		accept="image/*"
		onchange={upload}
	/>

	<div class="foot">
		<button class="pill pill--ink" type="button" onclick={saveTitle} disabled={!dirty || busy}>
			{t('event.save')}
		</button>
		{#if saved}<span class="ok"><Icon name="check" size={16} /> {t('event.saved')}</span>{/if}
		{#if err}<span class="err">{err}</span>{/if}
	</div>
</div>

<style>
	.event {
		display: flex;
		flex-direction: column;
		gap: 0.9rem;
	}

	.row {
		display: flex;
		flex-direction: column;
		gap: 0.4rem;
	}

	.lbl {
		font-size: var(--fs-1);
		font-weight: 600;
		color: var(--ink-55);
	}

	.photo {
		display: flex;
		align-items: center;
		gap: 0.75rem;
	}

	.acts {
		display: flex;
		flex-wrap: wrap;
		gap: 0.4rem;
	}

	.foot {
		display: flex;
		align-items: center;
		gap: 0.6rem;
		min-height: 40px;
	}

	.ok {
		display: inline-flex;
		align-items: center;
		gap: 0.3rem;
		font-size: var(--fs-1);
		font-weight: 600;
		color: var(--teal-deep);
	}

	.err {
		font-size: var(--fs-1);
		color: var(--coral);
	}

	@media (min-width: 720px) {
		.event {
			display: grid;
			grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
			align-content: start;
			column-gap: 1.5rem;
			row-gap: 0.75rem;
		}

		.foot {
			grid-column: 1 / -1;
		}
	}
</style>
