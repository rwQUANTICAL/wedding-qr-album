<script lang="ts">
	import { goto, invalidateAll } from '$app/navigation';
	import Icon from '$lib/components/Icon.svelte';
	import { i18n, setLangCookie } from '$lib/i18n/index.svelte';
	import { LIMITS } from '$lib/limits';
	import Credit from '$lib/components/Credit.svelte';
	import CoupleAvatar from '$lib/components/CoupleAvatar.svelte';
	import { LANGS, type Lang } from '$lib/i18n/messages';

	let { data } = $props();
	const t = i18n.t;
	// svelte-ignore state_referenced_locally
	let name = $state(data.guest?.name ?? '');
	let saving = $state(false);
	let error = $state<string | null>(null);

	function pick(lang: Lang): void {
		setLangCookie(lang);
		i18n.lang = lang;
	}

	async function submit(e: SubmitEvent): Promise<void> {
		e.preventDefault();
		if (!name.trim() || saving) return;
		saving = true;
		error = null;
		try {
			const res = await fetch('/api/me', {
				method: 'POST',
				headers: { 'content-type': 'application/json' },
				body: JSON.stringify({ name: name.trim() })
			});
			if (!res.ok) throw new Error((await res.json()).message ?? t('welcome.error'));
			await invalidateAll();
			await goto('/');
		} catch (err) {
			error = err instanceof Error ? err.message : t('welcome.error');
		} finally {
			saving = false;
		}
	}
</script>

<svelte:head><title>{t('welcome.title')} · {data.eventTitle}</title></svelte:head>

<section class="welcome">
	<div class="glow" aria-hidden="true"></div>
	<div class="slide">
		<div class="frame">
			<div class="top">
				<CoupleAvatar src={data.couplePhoto} size={56} />
				<div class="langs" role="radiogroup" aria-label={t('welcome.language')}>
					{#each LANGS as l (l.code)}
						<button
							type="button"
							role="radio"
							aria-checked={i18n.lang === l.code}
							class:on={i18n.lang === l.code}
							onclick={() => pick(l.code)}
							lang={l.code}>{l.label}</button
						>
					{/each}
				</div>
			</div>
			<h1>{data.eventTitle}</h1>
			<p class="lead">{t('welcome.lead')}</p>
			<form onsubmit={submit}>
				<label class="visually-hidden" for="name">{t('welcome.name')}</label>
				<input
					id="name"
					class="field"
					bind:value={name}
					maxlength={LIMITS.nameChars}
					placeholder={t('welcome.name')}
					autocomplete="given-name"
					autocapitalize="words"
					required
				/>
				<button class="pill pill--gold" type="submit" disabled={!name.trim() || saving}>
					{saving ? t('welcome.wait') : t('welcome.go')}
					<Icon name="back" size={18} />
				</button>
			</form>
			{#if error}<p class="error" role="alert">{error}</p>{/if}
		</div>
	</div>
	<div class="credit-slot"><Credit tone="inline" sparkle /></div>
</section>

<style>
	.welcome {
		position: relative;
		isolation: isolate;
		overflow: hidden;
		min-height: 100dvh;
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		gap: 1.75rem;
		padding: 1.5rem 1.25rem;
	}

	.credit-slot {
		position: relative;
	}

	.glow {
		position: absolute;
		inset: 10% 0 30%;
		background: radial-gradient(50% 50% at 50% 45%, var(--gold-soft), transparent 70%);
		pointer-events: none;
	}

	.slide {
		position: relative;
		width: min(100%, 440px);
		border-radius: var(--r-card);
		background: var(--card);
		box-shadow: var(--shadow-card-hover);
	}

	.frame {
		padding: 1.6rem 1.4rem 1.5rem;
		color: var(--ink);
	}

	.top {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 1rem;
		margin-bottom: 1rem;
	}

	.top :global(.couple) {
		box-shadow:
			0 6px 16px rgba(27, 42, 40, 0.25),
			0 0 0 3px var(--bg);
	}

	.langs {
		display: inline-flex;
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
		transition:
			background-color var(--t-fast) var(--ease-out),
			color var(--t-fast) var(--ease-out);
	}

	.langs button.on {
		color: var(--ink);
		background: var(--card);
		box-shadow: 0 1px 3px rgba(27, 42, 40, 0.2);
	}

	h1 {
		font-size: var(--fs-5);
		font-weight: 700;
		letter-spacing: -0.01em;
	}

	@media (min-width: 420px) {
		h1 {
			font-size: var(--fs-6);
		}
	}

	.lead {
		margin-top: 0.5rem;
		font-size: var(--fs-3);
		color: var(--ink-70);
	}

	form {
		display: flex;
		flex-direction: column;
		gap: 0.6rem;
		margin-top: 1.4rem;
	}

	form .pill {
		min-height: 50px;
		font-size: var(--fs-3);
	}

	form .pill :global(svg) {
		transform: scaleX(-1);
	}

	.error {
		margin-top: 0.6rem;
		font-size: var(--fs-2);
		color: var(--coral-deep);
	}
</style>
