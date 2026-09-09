<script lang="ts">
	import Icon from './Icon.svelte';
	import { uploads } from '$lib/upload.svelte';
	import { i18n } from '$lib/i18n/index.svelte';

	let input = $state<HTMLInputElement | null>(null);
	let open = $state(false);
	const t = i18n.t;

	const busy = $derived(uploads.active.length > 0);
	const ring = $derived(Math.round(uploads.totalProgress * 360));
	const hasItems = $derived(uploads.items.length > 0);

	$effect(() => {
		uploads.registerPicker(input);
		return () => uploads.registerPicker(null);
	});

	function pick(): void {
		if (hasItems && !busy) {
			open = !open;
			return;
		}
		input?.click();
	}

	function onFiles(e: Event): void {
		const el = e.currentTarget as HTMLInputElement;
		if (el.files?.length) {
			void uploads.add(el.files);
			open = true;
		}
		el.value = '';
	}

	$effect(() => {
		if (uploads.items.length === 0) open = false;
	});

	const lampLabel = $derived(
		busy
			? t('upload.aria.busy', { done: uploads.doneCount, total: uploads.items.length })
			: hasItems
				? t('upload.aria.show')
				: t('upload.aria.idle')
	);
</script>

<input
	bind:this={input}
	class="visually-hidden"
	type="file"
	accept="image/*,video/*,.heic,.heif"
	multiple
	onchange={onFiles}
	tabindex="-1"
	aria-hidden="true"
/>

<div class="dock" class:open>
	{#if hasItems && open}
		<section class="tray" aria-label={t('upload.list')}>
			<header>
				<h2 class="num">
					{#if busy}
						{t('upload.progress', { done: uploads.doneCount, total: uploads.items.length - uploads.failed.length })}
					{:else if uploads.failed.length === 1}
						{t('upload.failedOne')}
					{:else if uploads.failed.length}
						{t('upload.failedMany', { n: uploads.failed.length })}
					{:else}
						{t('upload.allDone')}
					{/if}
				</h2>
				<div class="actions">
					<button class="mini" onclick={() => input?.click()}><Icon name="plus" size={16} /> {t('upload.more')}</button>
					<button class="mini" onclick={() => uploads.clearDone()} disabled={uploads.doneCount === 0}>{t('upload.hideDone')}</button>
					<button class="mini icon" onclick={() => (open = false)} aria-label={t('upload.close')}><Icon name="close" size={16} /></button>
				</div>
			</header>
			<ul>
				{#each uploads.items as item (item.id)}
					<li class={item.state}>
						<span class="thumb">
							{#if item.preview}
								<img src={item.preview} alt="" />
							{:else}
								<Icon name={item.file.type.startsWith('video/') ? 'play' : 'film'} size={18} />
							{/if}
						</span>
						<span class="info">
							<span class="filename">{item.file.name}</span>
							{#if item.state === 'error'}
								<span class="err">{item.error}</span>
							{:else if item.state === 'done'}
								<span class="ok">{t('upload.done')}</span>
							{:else}
								<span class="bar" role="progressbar" aria-valuenow={Math.round(item.progress * 100)} aria-valuemin="0" aria-valuemax="100">
									<span style:transform="scaleX({item.progress})"></span>
								</span>
							{/if}
						</span>
						{#if item.state === 'error'}
							<button class="mini" onclick={() => uploads.retry(item.id)}><Icon name="rotate" size={14} /> {t('upload.retry')}</button>
							<button class="mini icon" onclick={() => uploads.dismiss(item.id)} aria-label={t('upload.remove')}><Icon name="close" size={14} /></button>
						{:else if item.state === 'done'}
							<span class="check"><Icon name="check" size={16} /></span>
						{/if}
					</li>
				{/each}
			</ul>
		</section>
	{/if}

	<button class="lamp" class:busy style:--ring="{ring}deg" onclick={pick} aria-label={lampLabel}>
		<span class="ringbg" aria-hidden="true"></span>
		<span class="core">
			{#if busy}
				<span class="num count">{uploads.active.length}</span>
			{:else if hasItems && uploads.failed.length}
				<Icon name="alert" size={24} />
			{:else}
				<Icon name="upload" size={26} />
			{/if}
		</span>
	</button>
	{#if !hasItems}
		<span class="hint">{t('upload.cta')}</span>
	{/if}
</div>

<style>
	.dock {
		position: fixed;
		left: 0;
		right: 0;
		bottom: 0;
		z-index: 20;
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 0.6rem;
		padding: 0 0.75rem calc(0.9rem + var(--safe-bottom));
		pointer-events: none;
	}

	.dock > * {
		pointer-events: auto;
	}

	.lamp {
		position: relative;
		width: 58px;
		height: 58px;
		border-radius: 999px;
		display: grid;
		place-items: center;
		color: #fff;
		transition: transform var(--t-fast) var(--ease-out);
	}

	.lamp:active {
		transform: scale(0.94);
	}

	/* Weisser Energiestrahl: laeuft alle 10 s einmal um den Knopf */
	.lamp::before {
		content: '';
		position: absolute;
		inset: -4px;
		border-radius: 999px;
		background: conic-gradient(from 0deg, transparent 0deg 300deg, rgba(255, 255, 255, 0.15) 320deg, rgba(255, 255, 255, 0.95) 352deg, transparent 360deg);
		-webkit-mask: radial-gradient(farthest-side, transparent calc(100% - 3px), #000 calc(100% - 2.5px));
		mask: radial-gradient(farthest-side, transparent calc(100% - 3px), #000 calc(100% - 2.5px));
		animation: beam 10s linear infinite;
		pointer-events: none;
	}

	.lamp:not(.busy)::after {
		content: '';
		position: absolute;
		inset: -4px;
		border-radius: 999px;
		box-shadow: 0 0 0 1px rgba(255, 255, 255, 0.35) inset;
		pointer-events: none;
	}

	@keyframes beam {
		0% { transform: rotate(0deg); opacity: 1; }
		14% { transform: rotate(360deg); opacity: 1; }
		14.01%, 100% { transform: rotate(360deg); opacity: 0; }
	}

	.ringbg {
		position: absolute;
		inset: 0;
		border-radius: 999px;
		background: conic-gradient(var(--teal) var(--ring), rgba(27, 42, 40, 0.18) 0);
		box-shadow: 0 8px 22px rgba(27, 42, 40, 0.28), 0 2px 6px rgba(27, 42, 40, 0.2);
		transition: background var(--t-base) linear;
	}

	.lamp:not(.busy) .ringbg {
		background: linear-gradient(135deg, #c9a24a 0%, #c9553a 100%);
	}

	.core {
		position: relative;
		width: 58px;
		height: 58px;
		border-radius: 999px;
		display: grid;
		place-items: center;
		background: linear-gradient(135deg, #c9a24a 0%, #c9553a 100%);
		box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.25), inset 0 -10px 18px rgba(27, 42, 40, 0.18);
	}

	.lamp.busy .core {
		width: 48px;
		height: 48px;
		background: var(--card);
		color: var(--teal);
		box-shadow: none;
	}

	.count {
		font-size: var(--fs-4);
		font-weight: 700;
	}

	.hint {
		padding: 0.3rem 0.7rem;
		border-radius: 999px;
		font-size: var(--fs-1);
		font-weight: 700;
		letter-spacing: 0.02em;
		color: var(--cream);
		background: var(--ink);
	}

	.tray {
		width: min(100%, 520px);
		max-height: 45dvh;
		display: flex;
		flex-direction: column;
		border-radius: var(--r-card);
		background: var(--card);
		color: var(--ink);
		box-shadow: var(--shadow-card-hover);
		overflow: hidden;
	}

	header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 0.5rem;
		padding: 0.75rem 0.9rem 0.5rem;
	}

	h2 {
		font-size: var(--fs-2);
		font-weight: 700;
	}

	.actions {
		display: flex;
		gap: 0.25rem;
	}

	.mini {
		display: inline-flex;
		align-items: center;
		gap: 0.3rem;
		min-height: 32px;
		padding: 0 0.6rem;
		border-radius: 999px;
		font-size: var(--fs-1);
		font-weight: 600;
		color: var(--ink);
		background: var(--ink-08);
	}

	.mini:hover {
		background: var(--ink-15);
	}

	.mini:disabled {
		opacity: 0.4;
	}

	.mini.icon {
		width: 32px;
		padding: 0;
		justify-content: center;
	}

	ul {
		list-style: none;
		margin: 0;
		padding: 0 0.6rem 0.6rem;
		overflow-y: auto;
	}

	li {
		display: flex;
		align-items: center;
		gap: 0.6rem;
		padding: 0.45rem 0.3rem;
		border-top: 1px solid var(--ink-08);
	}

	.thumb {
		flex: none;
		width: 40px;
		height: 40px;
		border-radius: 8px;
		overflow: hidden;
		display: grid;
		place-items: center;
		background: var(--bg-deep);
		color: var(--ink-55);
	}

	.thumb img {
		width: 100%;
		height: 100%;
		object-fit: cover;
	}

	.info {
		flex: 1;
		min-width: 0;
		display: flex;
		flex-direction: column;
		gap: 0.25rem;
	}

	.filename {
		font-size: var(--fs-2);
		font-weight: 600;
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}

	.bar {
		display: block;
		height: 4px;
		border-radius: 999px;
		background: var(--ink-08);
		overflow: hidden;
	}

	.bar span {
		display: block;
		height: 100%;
		width: 100%;
		background: var(--teal);
		transform-origin: left;
		transition: transform 200ms linear;
	}

	.ok,
	.err {
		font-size: var(--fs-1);
		font-weight: 500;
	}

	.ok {
		color: var(--teal-deep);
	}

	.err {
		color: var(--coral-deep);
	}

	.check {
		color: var(--teal);
	}
</style>
