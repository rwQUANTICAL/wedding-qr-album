<script lang="ts">
	import { fileUrl } from '$lib/media-url';
	import { goto, invalidateAll, preloadData } from '$app/navigation';
	import Icon from '$lib/components/Icon.svelte';
	import Comments from '$lib/components/Comments.svelte';
	import PhotoEditor from '$lib/components/PhotoEditor.svelte';
	import ConfirmSheet from '$lib/components/ConfirmSheet.svelte';
	import { LikeState } from '$lib/like.svelte';
	import Avatar from '$lib/components/Avatar.svelte';
	import { formatDayTime, formatDuration } from '$lib/format';
	import { i18n } from '$lib/i18n/index.svelte';
	import { LIMITS } from '$lib/limits';

	let { data } = $props();
	const t = i18n.t;

	let item = $derived(data.item);
	// svelte-ignore state_referenced_locally
	let comments = $state(data.comments);
	$effect(() => {
		comments = data.comments;
	});

	const like = new LikeState();
	$effect(() => like.sync(data.item));

	let chrome = $state(true);
	let sheet = $state<'closed' | 'peek' | 'full'>('peek');
	let openedAt = 0;
	let editing = $state(false);
	let captionOpen = $state(false);
	// svelte-ignore state_referenced_locally
	let caption = $state(data.item.caption ?? '');
	let confirmDelete = $state(false);
	let busy = $state(false);

	const canWrite = $derived(!!data.guest);
	const canEdit = $derived(item.mine || data.isAdmin);
	const isVideo = $derived(item.kind === 'video');
	const kindWord = $derived(i18n.kind(item.kind));

	$effect(() => {
		if (item.status !== 'processing') return;
		const timer = setInterval(() => void invalidateAll(), 3000);
		return () => clearInterval(timer);
	});

	$effect(() => {
		if (data.nextId) void preloadData(`/m/${data.nextId}`);
		if (data.prevId) void preloadData(`/m/${data.prevId}`);
	});

	$effect(() => {
		sheet = 'peek';
		chrome = true;
		captionOpen = false;
		confirmDelete = false;
		openedAt = Date.now();
		void item.id;
	});

	function toggleLike(): void {
		if (!canWrite || item.status !== 'ready') return;
		like.toggle();
	}

	async function saveCaption(e: SubmitEvent): Promise<void> {
		e.preventDefault();
		busy = true;
		const res = await fetch(`/api/media/${item.id}`, {
			method: 'PATCH',
			headers: { 'content-type': 'application/json' },
			body: JSON.stringify({ caption: caption.trim() || null })
		}).catch(() => null);
		busy = false;
		if (!res?.ok) return;
		await invalidateAll();
		captionOpen = false;
	}

	async function remove(): Promise<void> {
		busy = true;
		const res = await fetch(`/api/media/${item.id}`, { method: 'DELETE' });
		busy = false;
		if (res.ok) await goto(item.mine ? '/me' : '/', { invalidateAll: true });
	}

	function close(): void {
		if (history.length > 1) history.back();
		else void goto('/');
	}

	function go(id: string | null): void {
		if (id) void goto(`/m/${id}`, { replaceState: true, noScroll: true });
	}

	function onStageClick(): void {
		if (isVideo) return;
		if (Date.now() - openedAt < 500) return;
		if (sheet !== 'closed') {
			sheet = 'closed';
			return;
		}
		chrome = !chrome;
	}

	function sheetUp(): void {
		sheet = sheet === 'closed' ? 'peek' : 'full';
		chrome = true;
	}

	function sheetDown(): void {
		if (sheet === 'full') sheet = 'peek';
		else if (sheet === 'peek') sheet = 'closed';
		else close();
	}

	let touch: { x: number; y: number; t: number } | null = null;

	function onTouchStart(e: TouchEvent): void {
		const p = e.changedTouches[0];
		touch = { x: p.clientX, y: p.clientY, t: Date.now() };
	}

	function onTouchEnd(e: TouchEvent): void {
		if (!touch) return;
		const p = e.changedTouches[0];
		const dx = p.clientX - touch.x;
		const dy = p.clientY - touch.y;
		const fast = Date.now() - touch.t < 600;
		touch = null;
		if (!fast) return;
		if (Math.abs(dx) > 60 && Math.abs(dx) > Math.abs(dy) * 1.5) {
			go(dx < 0 ? data.nextId : data.prevId);
			return;
		}
		if (dy < -60 && Math.abs(dy) > Math.abs(dx) * 1.5) {
			sheetUp();
			return;
		}
		if (dy > 60 && Math.abs(dy) > Math.abs(dx) * 1.5) {
			sheetDown();
		}
	}

	function onKey(e: KeyboardEvent): void {
		if (e.key === 'ArrowRight') go(data.nextId);
		else if (e.key === 'ArrowLeft') go(data.prevId);
		else if (e.key === 'Escape') {
			if (sheet !== 'closed') sheet = 'closed';
			else close();
		}
	}
</script>

<svelte:head><title>{t('viewer.title', { name: item.guest.name, kind: i18n.kind(item.kind, true) })} · {data.eventTitle}</title></svelte:head>
<svelte:window onkeydown={onKey} />

<div class="viewer" class:chrome class:peek={sheet === 'peek'} class:full={sheet === 'full'}>
	<!-- svelte-ignore a11y_no_static_element_interactions, a11y_click_events_have_key_events -->
	<div class="stage" onclick={onStageClick} ontouchstart={onTouchStart} ontouchend={onTouchEnd}>
		{#if item.status === 'ready' && isVideo}
			<!-- svelte-ignore a11y_media_has_caption -->
			<video src={fileUrl(item, 'video')} poster={fileUrl(item, 'poster')} controls playsinline preload="metadata" width={item.width ?? 1920} height={item.height ?? 1080}></video>
		{:else if item.status === 'ready'}
			<img src={fileUrl(item, 'web')} alt={item.caption ?? t('viewer.altPhoto', { name: item.guest.name })} width={item.width ?? 1600} height={item.height ?? 1200} decoding="async" fetchpriority="high" draggable="false" />
		{:else if item.status === 'processing'}
			<div class="state">
				<span class="warming" aria-hidden="true"></span>
				<p>{t('viewer.processing')}</p>
				<p class="sub">{isVideo ? t('viewer.processingVideo') : t('viewer.processingPhoto')}</p>
			</div>
		{:else}
			<div class="state state--failed">
				<Icon name="alert" size={28} />
				<p>{t('viewer.failed', { kind: kindWord })}</p>
				<p class="sub">{item.error}</p>
			</div>
		{/if}
	</div>

	{#if data.prevId}
		<button class="arrow arrow--prev" onclick={() => go(data.prevId)} aria-label={t('screen.prev')}><Icon name="back" size={22} /></button>
	{/if}
	{#if data.nextId}
		<button class="arrow arrow--next" onclick={() => go(data.nextId)} aria-label={t('screen.next')}><Icon name="back" size={22} /></button>
	{/if}

	<header class="top">
		<button class="iconbtn" onclick={close} aria-label={t('viewer.back')}><Icon name="back" size={22} /></button>
		<div class="who">
			<span class="name"><Avatar guest={item.guest} size={22} /> {item.guest.name}{#if item.mine} <span class="you">{t('viewer.you')}</span>{/if}</span>
			<time class="num" datetime={item.createdAt}>{formatDayTime(item.createdAt, i18n.locale)}{#if isVideo && item.duration} · {formatDuration(item.duration)}{/if}</time>
		</div>
		{#if item.status === 'ready'}
			<a class="iconbtn" href={fileUrl(item, isVideo ? 'video' : 'original', true)} download aria-label={t('viewer.download')}><Icon name="download" size={22} /></a>
		{:else}
			<span class="iconbtn" aria-hidden="true"></span>
		{/if}
	</header>

	<footer class="tools">
		<button class="tool like" class:liked={like.liked} class:pop={like.pop} onclick={toggleLike} disabled={!canWrite || item.status !== 'ready'} aria-pressed={like.liked} aria-label={like.liked ? t('viewer.unlike') : t('viewer.like')}>
			<Icon name="heart" size={22} filled={like.liked} />
			<span class="num">{like.count}</span>
		</button>
		<button class="tool" onclick={() => (sheet = sheet === 'full' ? 'closed' : 'full')} aria-expanded={sheet !== 'closed'} aria-controls="sheet" aria-label={t('comments.title')}>
			<Icon name="comment" size={22} />
			<span class="num">{comments.length}</span>
		</button>
		{#if canEdit}
			{#if !isVideo && item.status === 'ready'}
				<button class="tool" onclick={() => (editing = true)} aria-label={t('viewer.edit')}><Icon name="crop" size={22} /></button>
			{/if}
			<button class="tool danger" onclick={() => (confirmDelete = true)} aria-label={t('viewer.delete')}><Icon name="trash" size={22} /></button>
		{/if}
	</footer>

	<section id="sheet" class="sheet" aria-label={t('comments.title')}>
		<button class="handle" onclick={() => (sheet = sheet === 'full' ? 'peek' : 'full')} aria-label={t('comments.title')}><span></span></button>
		<div class="sheet-body">
			{#if captionOpen}
				<form class="captionform" onsubmit={saveCaption}>
					<input class="field" bind:value={caption} maxlength={LIMITS.captionChars} placeholder={t('viewer.caption')} aria-label={t('viewer.caption')} />
					<button class="pill pill--gold" type="submit" disabled={busy}>{t('viewer.save')}</button>
					<button class="pill pill--soft" type="button" onclick={() => (captionOpen = false)}>{t('viewer.cancel')}</button>
				</form>
			{:else if item.caption}
				<p class="caption">
					<em>{item.caption}</em>
					{#if canEdit}<button class="editcap" onclick={() => (captionOpen = true)} aria-label={t('viewer.editCaption')}><Icon name="pencil" size={16} /></button>{/if}
				</p>
			{:else if canEdit}
				<button class="addcap" onclick={() => (captionOpen = true)}><Icon name="pencil" size={16} /> {t('viewer.addCaption')}</button>
			{/if}
			<p class="likeline num">
				<Icon name="heart" size={14} filled /> {like.count}
			</p>
			<Comments mediaId={item.id} bind:comments {canWrite} isAdmin={data.isAdmin} />
		</div>
	</section>
</div>

{#if confirmDelete}
	<ConfirmSheet text={t('viewer.confirm', { kind: kindWord })} yes={t('viewer.confirmYes')} no={t('viewer.confirmNo')} {busy} onyes={remove} onno={() => (confirmDelete = false)} />
{/if}

{#if editing}
	<PhotoEditor {item} onclose={() => (editing = false)} onsaved={async () => { editing = false; await invalidateAll(); }} />
{/if}

<style>
	.viewer {
		position: fixed;
		inset: 0;
		z-index: 15;
		background: #0b0d0d;
		color: #fff;
		overflow: hidden;
		touch-action: pan-y;
	}

	.stage {
		position: absolute;
		inset: 0;
		display: flex;
		align-items: center;
		justify-content: center;
		transition: bottom 320ms var(--ease-out);
	}

	.peek .stage,
	.full .stage {
		bottom: min(38dvh, 340px);
	}

	img,
	video {
		max-width: 100%;
		max-height: 100%;
		width: auto;
		height: auto;
		object-fit: contain;
		user-select: none;
		-webkit-user-select: none;
	}

	video {
		width: 100%;
		max-height: 100%;
	}

	.state {
		position: relative;
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		gap: 0.3rem;
		padding: 2rem 1.5rem;
		text-align: center;
		font-weight: 700;
		color: rgba(255, 255, 255, 0.85);
	}

	.state .sub {
		font-weight: 500;
		font-size: var(--fs-2);
		color: rgba(255, 255, 255, 0.6);
		max-width: 30ch;
	}

	.warming {
		position: absolute;
		inset: -40%;
		background: radial-gradient(40% 40% at 50% 50%, var(--gold-soft), transparent 70%);
		animation: warm 2.4s var(--ease-out) infinite alternate;
	}

	@keyframes warm {
		from { opacity: 0.3; transform: scale(0.8); }
		to { opacity: 1; transform: scale(1.15); }
	}

	.state--failed {
		color: #f6b8a5;
	}

	.top,
	.tools,
	.arrow {
		transition: opacity var(--t-base) var(--ease-out), transform var(--t-base) var(--ease-out);
	}

	.viewer:not(.chrome) .top,
	.viewer:not(.chrome) .tools,
	.viewer:not(.chrome) .arrow {
		opacity: 0;
		pointer-events: none;
	}

	.viewer:not(.chrome) .top {
		transform: translateY(-12px);
	}

	.viewer:not(.chrome) .tools {
		transform: translateY(12px);
	}

	.top {
		position: absolute;
		top: 0;
		left: 0;
		right: 0;
		display: flex;
		align-items: center;
		gap: 0.5rem;
		padding: calc(0.4rem + env(safe-area-inset-top, 0px)) 0.5rem 1.2rem;
		background: linear-gradient(rgba(0, 0, 0, 0.65), transparent);
	}

	.iconbtn {
		flex: none;
		width: 44px;
		height: 44px;
		display: grid;
		place-items: center;
		border-radius: 999px;
		color: #fff;
	}

	.who {
		flex: 1;
		min-width: 0;
		display: flex;
		flex-direction: column;
		align-items: center;
		line-height: 1.25;
		text-shadow: 0 1px 4px rgba(0, 0, 0, 0.6);
	}

	.name {
		display: inline-flex;
		align-items: center;
		gap: 0.4rem;
		font-weight: 700;
		white-space: nowrap;
		max-width: 100%;
	}

	.you {
		display: inline-block;
		margin-left: 0.3rem;
		padding: 0.05rem 0.45rem;
		border-radius: 999px;
		font-size: var(--fs-1);
		font-weight: 700;
		color: var(--ink);
		background: var(--gold);
		text-shadow: none;
		vertical-align: 0.1em;
	}

	.who time {
		font-size: var(--fs-1);
		color: rgba(255, 255, 255, 0.75);
	}

	.arrow {
		position: absolute;
		top: 50%;
		width: 44px;
		height: 64px;
		display: none;
		place-items: center;
		color: rgba(255, 255, 255, 0.8);
		transform: translateY(-50%);
	}

	.arrow--prev { left: 6px; }
	.arrow--next { right: 6px; }
	.arrow--next :global(svg) { transform: scaleX(-1); }

	@media (min-width: 900px) {
		.arrow { display: grid; }
	}

	.tools {
		position: absolute;
		left: 0;
		right: 0;
		bottom: 0;
		display: flex;
		justify-content: center;
		gap: 0.5rem;
		padding: 1.2rem 0.75rem calc(0.9rem + var(--safe-bottom));
		background: linear-gradient(transparent, rgba(0, 0, 0, 0.7));
	}

	.tool {
		display: inline-flex;
		align-items: center;
		gap: 0.4rem;
		min-height: 46px;
		min-width: 46px;
		padding: 0 0.9rem;
		border-radius: 999px;
		font-size: var(--fs-2);
		font-weight: 700;
		color: #fff;
		background: rgba(255, 255, 255, 0.14);
		backdrop-filter: blur(10px);
		-webkit-backdrop-filter: blur(10px);
		transition: background-color var(--t-fast) var(--ease-out), transform var(--t-fast) var(--ease-out);
	}

	.tool:active {
		transform: scale(0.95);
	}

	.tool:disabled {
		opacity: 0.5;
	}

	.like.liked {
		color: var(--coral);
	}

	.like.pop :global(svg) {
		animation: pop 380ms var(--ease-out);
	}

	@keyframes pop {
		0% { transform: scale(1); }
		40% { transform: scale(1.35); }
		100% { transform: scale(1); }
	}

	.danger:hover {
		background: var(--coral-soft);
		color: #f6b8a5;
	}

	.sheet {
		position: absolute;
		left: 0;
		right: 0;
		bottom: 0;
		height: 72dvh;
		max-height: 72dvh;
		display: flex;
		flex-direction: column;
		border-radius: var(--r-card) var(--r-card) 0 0;
		background: var(--bg);
		color: var(--ink);
		box-shadow: var(--shadow-sheet);
		transform: translateY(100%);
		transition: transform 320ms var(--ease-out);
		will-change: transform;
	}

	.peek .sheet {
		transform: translateY(calc(100% - min(38dvh, 340px)));
	}

	.full .sheet {
		transform: translateY(0);
	}

	.peek .tools,
	.full .tools {
		bottom: min(38dvh, 340px);
		padding-bottom: 0.6rem;
		background: none;
	}

	.full .tools {
		opacity: 0;
		pointer-events: none;
	}

	.handle {
		flex: none;
		width: 100%;
		height: 28px;
		display: grid;
		place-items: center;
	}

	.handle span {
		width: 40px;
		height: 5px;
		border-radius: 999px;
		background: var(--ink-15);
	}

	.sheet-body {
		overflow-y: auto;
		padding: 0 1rem calc(1rem + var(--safe-bottom));
	}

	.caption {
		display: flex;
		align-items: baseline;
		gap: 0.5rem;
		font-size: var(--fs-4);
		font-weight: 500;
	}

	.caption em {
		font-style: italic;
	}

	.editcap {
		color: var(--ink-55);
		padding: 0.2rem;
	}

	.addcap {
		display: inline-flex;
		align-items: center;
		gap: 0.4rem;
		min-height: 36px;
		font-size: var(--fs-2);
		font-weight: 700;
		color: var(--teal-deep);
	}

	.captionform {
		display: grid;
		grid-template-columns: 1fr auto auto;
		gap: 0.5rem;
	}

	.likeline {
		display: inline-flex;
		align-items: center;
		gap: 0.3rem;
		margin-top: 0.4rem;
		font-size: var(--fs-2);
		font-weight: 700;
		color: var(--coral);
	}

	@media (min-width: 900px) {
		.sheet {
			left: auto;
			right: 1rem;
			bottom: 1rem;
			width: 420px;
			height: auto;
			max-height: calc(100dvh - 2rem);
			border-radius: var(--r-card);
		}
		.peek .sheet,
		.full .sheet {
			transform: translateY(0);
		}
		.peek .stage,
		.full .stage {
			bottom: 0;
			right: 460px;
		}
		.peek .tools,
		.full .tools {
			bottom: 0;
			right: 460px;
			padding-bottom: calc(0.9rem + var(--safe-bottom));
			background: linear-gradient(transparent, rgba(0, 0, 0, 0.7));
			opacity: 1;
			pointer-events: auto;
		}
	}

</style>
