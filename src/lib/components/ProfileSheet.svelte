<script lang="ts">
	import { invalidateAll } from '$app/navigation';
	import type { Guest } from '$lib/server/db';
	import Avatar from './Avatar.svelte';
	import Icon from './Icon.svelte';
	import { i18n, setLangCookie } from '$lib/i18n/index.svelte';
	import { LANGS, type Lang } from '$lib/i18n/messages';
	import { LIMITS } from '$lib/limits';

	interface Props {
		guest: Guest;
		isAdmin: boolean;
		recoveryUrl: string | null;
		onclose: () => void;
	}

	let { guest, isAdmin, recoveryUrl, onclose }: Props = $props();
	let copied = $state(false);

	async function copyLink(): Promise<void> {
		if (!recoveryUrl) return;
		if (navigator.share && /Mobi|Android/i.test(navigator.userAgent)) {
			try {
				await navigator.share({ url: recoveryUrl });
				return;
			} catch {
				/* abgebrochen */
			}
		}
		await navigator.clipboard.writeText(recoveryUrl);
		copied = true;
		setTimeout(() => (copied = false), 1500);
	}
	const t = i18n.t;

	// svelte-ignore state_referenced_locally
	let name = $state(guest.name);
	let busy = $state(false);
	let saved = $state(false);
	let error = $state<string | null>(null);
	let fileInput = $state<HTMLInputElement | null>(null);

	async function request(url: string, init: RequestInit): Promise<boolean> {
		busy = true;
		error = null;
		try {
			const res = await fetch(url, init);
			if (!res.ok) {
				error = (await res.json().catch(() => ({}))).message ?? t('profile.error');
				return false;
			}
			await invalidateAll();
			saved = true;
			setTimeout(() => (saved = false), 1500);
			return true;
		} catch {
			error = t('profile.error');
			return false;
		} finally {
			busy = false;
		}
	}

	async function saveName(e: SubmitEvent): Promise<void> {
		e.preventDefault();
		const value = name.trim();
		if (!value || value === guest.name) return;
		await request('/api/me', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ name: value }) });
	}

	async function onFile(e: Event): Promise<void> {
		const el = e.currentTarget as HTMLInputElement;
		const file = el.files?.[0];
		el.value = '';
		if (!file) return;
		await request('/api/me/avatar', {
			method: 'POST',
			headers: { 'content-type': file.type || 'application/octet-stream', 'x-filename': encodeURIComponent(file.name) },
			body: file
		});
	}

	async function removeAvatar(): Promise<void> {
		await request('/api/me/avatar', { method: 'DELETE' });
	}

	async function pickLang(lang: Lang): Promise<void> {
		setLangCookie(lang);
		i18n.lang = lang;
		await invalidateAll();
	}

	function onKey(e: KeyboardEvent): void {
		if (e.key === 'Escape') onclose();
	}
</script>

<svelte:window onkeydown={onKey} />

<!-- svelte-ignore a11y_no_static_element_interactions, a11y_click_events_have_key_events -->
<div class="backdrop" onclick={onclose}></div>
<div class="panel card" role="dialog" aria-modal="true" aria-labelledby="profile-h">
	<header>
		<h2 id="profile-h">{t('profile.title')}</h2>
		<button class="close" onclick={onclose} aria-label={t('profile.close')}><Icon name="close" size={20} /></button>
	</header>

	<div class="photo">
		<Avatar {guest} size={72} />
		<div class="photo-actions">
			<input bind:this={fileInput} class="visually-hidden" type="file" accept="image/*,.heic,.heif" onchange={onFile} tabindex="-1" />
			<button class="pill pill--soft small" onclick={() => fileInput?.click()} disabled={busy}><Icon name="upload" size={14} /> {t('profile.choose')}</button>
			{#if guest.avatar > 0}
				<button class="pill pill--soft small" onclick={removeAvatar} disabled={busy}><Icon name="trash" size={14} /> {t('profile.remove')}</button>
			{/if}
		</div>
	</div>

	<form class="namerow" onsubmit={saveName}>
		<label class="visually-hidden" for="profile-name">{t('profile.name')}</label>
		<input id="profile-name" class="field" bind:value={name} maxlength={LIMITS.nameChars} autocomplete="given-name" required />
		<button class="pill pill--gold" type="submit" disabled={busy || !name.trim() || name.trim() === guest.name}>{saved ? t('profile.saved') : t('profile.save')}</button>
	</form>
	{#if error}<p class="error" role="alert">{error}</p>{/if}

	<p class="label">{t('profile.language')}</p>
	<div class="langs" role="radiogroup" aria-label={t('profile.language')}>
		{#each LANGS as l (l.code)}
			<button type="button" role="radio" aria-checked={i18n.lang === l.code} class:on={i18n.lang === l.code} onclick={() => pickLang(l.code)} lang={l.code}>{l.label}</button>
		{/each}
	</div>

	{#if recoveryUrl}
		<div class="recovery">
			<p class="label">{t('profile.recoveryTitle')}</p>
			<p class="help">{t('profile.recoveryText')}</p>
			<button class="pill pill--soft small" onclick={copyLink}><Icon name="send" size={14} /> {copied ? t('profile.copied') : t('profile.copyLink')}</button>
		</div>
	{/if}

	{#if isAdmin}
		<a class="pill pill--ink adminlink" href="/admin" onclick={onclose}><Icon name="qr" size={16} /> {t('profile.admin')}</a>
	{/if}
</div>

<style>
	.backdrop {
		position: fixed;
		inset: 0;
		z-index: 30;
		background: rgba(27, 42, 40, 0.28);
	}

	.panel {
		position: fixed;
		z-index: 31;
		left: 0.75rem;
		right: 0.75rem;
		bottom: calc(0.75rem + var(--safe-bottom));
		padding: 1rem;
		display: flex;
		flex-direction: column;
		gap: 0.8rem;
		box-shadow: var(--shadow-card-hover);
	}

	@media (min-width: 640px) {
		.panel {
			left: auto;
			bottom: auto;
			top: 64px;
			right: 1rem;
			width: 360px;
		}
	}

	header {
		display: flex;
		align-items: center;
		justify-content: space-between;
	}

	h2 {
		font-size: var(--fs-4);
		font-weight: 700;
	}

	.close {
		width: 36px;
		height: 36px;
		display: grid;
		place-items: center;
		border-radius: 999px;
		color: var(--ink-70);
	}

	.close:hover {
		background: var(--ink-08);
	}

	.photo {
		display: flex;
		align-items: center;
		gap: 0.9rem;
	}

	.photo :global(.avatar) {
		box-shadow: 0 4px 12px rgba(27, 42, 40, 0.2), 0 0 0 2px var(--card);
	}

	.photo-actions {
		display: flex;
		flex-wrap: wrap;
		gap: 0.4rem;
	}

	.pill.small {
		min-height: 36px;
		padding: 0 0.75rem;
		font-size: var(--fs-1);
	}

	.namerow {
		display: flex;
		gap: 0.5rem;
	}

	.namerow .field {
		min-width: 0;
	}

	.error {
		font-size: var(--fs-2);
		color: var(--coral-deep);
	}

	.label {
		font-size: var(--fs-1);
		font-weight: 700;
		color: var(--ink-55);
		margin-bottom: -0.4rem;
	}

	.langs {
		display: inline-flex;
		align-self: flex-start;
		padding: 3px;
		border-radius: 999px;
		background: var(--ink-08);
	}

	.langs button {
		min-height: 34px;
		padding: 0 0.75rem;
		border-radius: 999px;
		font-size: var(--fs-1);
		font-weight: 600;
		color: var(--ink-70);
		transition: background-color var(--t-fast) var(--ease-out), color var(--t-fast) var(--ease-out);
	}

	.langs button.on {
		color: var(--ink);
		background: var(--card);
		box-shadow: 0 1px 3px rgba(27, 42, 40, 0.2);
	}

	.adminlink {
		align-self: flex-start;
	}

	.recovery {
		display: flex;
		flex-direction: column;
		gap: 0.35rem;
		padding-top: 0.4rem;
		border-top: 1px solid var(--ink-08);
	}

	.recovery .label {
		margin-bottom: 0;
	}

	.help {
		font-size: var(--fs-1);
		line-height: 1.45;
		color: var(--ink-55);
	}

	.recovery .pill {
		align-self: flex-start;
	}
</style>
