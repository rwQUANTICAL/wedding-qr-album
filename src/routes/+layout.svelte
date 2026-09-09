<script lang="ts">
	import '../app.css';
	import { page } from '$app/state';
	import { invalidateAll } from '$app/navigation';
	import Lamp from '$lib/components/Lamp.svelte';
	import Icon from '$lib/components/Icon.svelte';
	import Avatar from '$lib/components/Avatar.svelte';
	import CoupleAvatar from '$lib/components/CoupleAvatar.svelte';
	import ProfileSheet from '$lib/components/ProfileSheet.svelte';
	import Credit from '$lib/components/Credit.svelte';
	import { i18n, setLangCookie } from '$lib/i18n/index.svelte';
	import { LANGS, isLang } from '$lib/i18n/messages';
	import { selection } from '$lib/selection.svelte';

	let { data, children } = $props();
	let profileOpen = $state(false);

	// SSR und Erstaufruf: Sprache vor dem Rendern der Kinder setzen
	// svelte-ignore state_referenced_locally
	i18n.lang = data.lang;
	$effect.pre(() => {
		i18n.lang = data.lang;
	});

	const t = i18n.t;
	const showLamp = $derived(
		!!data.guest && !selection.active && (page.url.pathname === '/' || page.url.pathname === '/me')
	);
	const isHome = $derived(page.url.pathname === '/');
	const isMe = $derived(page.url.pathname === '/me');
	const counter = $derived.by(() => {
		const st = data.stats;
		if (!st || st.photos + st.videos === 0) return '';
		const parts = [i18n.n('count.photo', st.photos)];
		if (st.videos) parts.push(i18n.n('count.video', st.videos));
		parts.push(i18n.n('count.guest', st.guests));
		return parts.join(' · ');
	});

	async function changeLang(e: Event): Promise<void> {
		const value = (e.currentTarget as HTMLSelectElement).value;
		if (!isLang(value)) return;
		setLangCookie(value);
		i18n.lang = value;
		await invalidateAll();
	}
</script>

<svelte:head>
	<title>{data.eventTitle} · {t('title.photos')}</title>
</svelte:head>

{#if page.url.pathname !== '/welcome' && !page.url.pathname.startsWith('/m/')}
	<nav class="topbar" aria-label="Navigation">
		<a class="brand" href="/" aria-current={isHome ? 'page' : undefined}>
			<CoupleAvatar src={data.couplePhoto} size={40} />
			<span class="brandtext">
				<span class="title">{data.eventTitle}</span>
				{#if counter}
					<span class="counter num">{counter}</span>
				{/if}
			</span>
		</a>
		<div class="links">
			<a href="/" class="navitem" class:active={isHome} aria-current={isHome ? 'page' : undefined}>
				<span class="ico"><Icon name="grid" size={18} /></span><span class="lbl"
					>{t('nav.all')}</span
				>
			</a>
			{#if data.guest}
				<a href="/me" class="navitem" class:active={isMe} aria-current={isMe ? 'page' : undefined}>
					<span class="ico"><Icon name="user" size={18} /></span><span class="lbl"
						>{t('nav.mine')}</span
					>
				</a>
			{/if}
			{#if data.isAdmin}
				<a href="/admin" class="navitem" class:active={page.url.pathname.startsWith('/admin')}>
					<span class="ico"><Icon name="qr" size={18} /></span><span class="lbl"
						>{t('nav.admin')}</span
					>
				</a>
			{/if}
			<a href="/info" class="navitem" class:active={page.url.pathname === '/info'}>
				<span class="ico"><Icon name="info" size={18} /></span><span class="lbl"
					>{t('info.nav')}</span
				>
			</a>
			{#if data.guest}
				<button
					class="profile"
					onclick={() => (profileOpen = !profileOpen)}
					aria-label={t('profile.open')}
					aria-expanded={profileOpen}
				>
					<Avatar guest={data.guest} size={36} />
				</button>
			{:else}
				<label class="lang">
					<span class="visually-hidden">{t('nav.language')}</span>
					<span class="code" aria-hidden="true">{i18n.lang.toUpperCase()}</span>
					<select value={i18n.lang} onchange={changeLang}>
						{#each LANGS as l (l.code)}
							<option value={l.code}>{l.label}</option>
						{/each}
					</select>
				</label>
			{/if}
		</div>
	</nav>
{/if}

<main class:padded={showLamp || selection.active}>
	{@render children()}
	{#if !page.url.pathname.startsWith('/m/') && page.url.pathname !== '/welcome'}
		<Credit />
	{/if}
</main>

{#if showLamp}
	<Lamp />
{/if}

{#if profileOpen && data.guest}
	<ProfileSheet
		guest={data.guest}
		isAdmin={data.isAdmin}
		recoveryUrl={data.recoveryUrl}
		onclose={() => (profileOpen = false)}
	/>
{/if}

<style>
	.topbar {
		position: sticky;
		top: 0;
		z-index: 10;
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 1rem;
		padding: 0.6rem 1rem;
		padding-top: calc(0.6rem + env(safe-area-inset-top, 0px));
		background: rgba(247, 241, 227, 0.86);
		backdrop-filter: blur(12px);
		-webkit-backdrop-filter: blur(12px);
		box-shadow: inset 0 -1px 0 var(--ink-08);
	}

	.brand {
		flex: 1 1 auto;
		display: inline-flex;
		align-items: center;
		gap: 0.7rem;
		min-height: 40px;
		min-width: 0;
	}

	.brandtext {
		display: flex;
		flex-direction: column;
		min-width: 0;
		line-height: 1.2;
	}

	.title {
		font-size: var(--fs-2);
		font-weight: 700;
		letter-spacing: 0.01em;
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}

	@media (min-width: 640px) {
		.title {
			font-size: var(--fs-4);
		}
	}

	.counter {
		font-size: var(--fs-1);
		font-weight: 500;
		color: var(--ink-55);
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}

	.links {
		flex: none;
		display: flex;
		align-items: center;
		gap: 0.3rem;
	}

	.navitem {
		display: inline-flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		gap: 0.1rem;
		min-width: 48px;
		padding: 0.15rem 0.25rem;
		border-radius: 12px;
		color: var(--ink-70);
		transition: color var(--t-fast) var(--ease-out);
	}

	.ico {
		width: 34px;
		height: 34px;
		display: grid;
		place-items: center;
		border-radius: 999px;
		transition:
			background-color var(--t-fast) var(--ease-out),
			color var(--t-fast) var(--ease-out);
	}

	.lbl {
		font-size: 0.6875rem;
		font-weight: 600;
		line-height: 1;
		white-space: nowrap;
	}

	.navitem:hover .ico {
		background: var(--ink-08);
	}

	.navitem.active {
		color: var(--ink);
	}

	.navitem.active .ico {
		color: #fff;
		background: var(--ink);
	}

	.navitem.active .lbl {
		font-weight: 700;
	}

	@media (min-width: 640px) {
		.links {
			gap: 0.25rem;
		}
		.navitem {
			flex-direction: row;
			gap: 0.4rem;
			min-height: 40px;
			padding: 0 0.85rem 0 0.6rem;
			border-radius: var(--r-pill);
			font-size: var(--fs-2);
		}
		.ico {
			width: auto;
			height: auto;
			background: none !important;
			color: inherit !important;
		}
		.lbl {
			font-size: var(--fs-2);
		}
		.navitem:hover {
			background: var(--ink-08);
		}
		.navitem.active {
			color: #fff;
			background: var(--ink);
		}
	}

	@media (max-width: 639px) {
		.topbar {
			gap: 0.5rem;
			padding-left: 0.75rem;
			padding-right: 0.75rem;
		}
		.brand {
			gap: 0.5rem;
		}
		.brand :global(.couple) {
			width: 34px !important;
			height: 34px !important;
		}
		.title {
			font-size: var(--fs-2);
			white-space: normal;
			line-height: 1.15;
			max-width: 5.2em;
			display: -webkit-box;
			-webkit-line-clamp: 2;
			line-clamp: 2;
			-webkit-box-orient: vertical;
			overflow: hidden;
		}
		.counter {
			display: none;
		}
	}

	.profile {
		margin-left: 0.75rem;
		width: 40px;
		height: 40px;
		display: grid;
		place-items: center;
		border-radius: 999px;
		transition: transform var(--t-fast) var(--ease-out);
	}

	.profile:hover {
		transform: scale(1.05);
	}

	.profile :global(.avatar) {
		box-shadow:
			0 2px 8px rgba(27, 42, 40, 0.25),
			0 0 0 2px var(--card);
	}

	@media (max-width: 400px) {
		.navitem {
			min-width: 42px;
			padding: 0.15rem 0.1rem;
		}
		.lbl {
			font-size: 0.625rem;
		}
		.profile {
			margin-left: 0.4rem;
		}
	}

	.lang {
		position: relative;
		display: inline-flex;
		align-items: center;
		justify-content: center;
		min-width: 44px;
		min-height: 40px;
		padding: 0 0.6rem;
		border-radius: var(--r-pill);
		font-size: var(--fs-1);
		font-weight: 700;
		letter-spacing: 0.06em;
		color: var(--ink-70);
		box-shadow: inset 0 0 0 1px var(--ink-15);
	}

	.lang:hover {
		color: var(--ink);
		background: var(--ink-08);
	}

	.lang select {
		position: absolute;
		inset: 0;
		width: 100%;
		opacity: 0;
		cursor: pointer;
		appearance: none;
	}

	.lang:has(select:focus-visible) {
		outline: 2px solid var(--teal);
		outline-offset: 2px;
	}

	main {
		min-height: calc(100dvh - 56px);
	}

	main.padded {
		padding-bottom: var(--lamp-space);
	}
</style>
