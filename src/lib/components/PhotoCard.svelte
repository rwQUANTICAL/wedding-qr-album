<script lang="ts">
	import { fileUrl } from '$lib/media-url';
	import type { MediaView } from '$lib/server/media';
	import Icon from './Icon.svelte';
	import { formatDuration } from '$lib/format';
	import { i18n } from '$lib/i18n/index.svelte';
	import { selection } from '$lib/selection.svelte';
	import { LikeState } from '$lib/like.svelte';
	import Avatar from './Avatar.svelte';

	interface Props {
		item: MediaView;
		eager?: boolean;
		canLike?: boolean;
		sizes?: string;
	}

	let { item, eager = false, canLike = true, sizes = '50vw' }: Props = $props();
	let loaded = $state(false);
	const like = new LikeState();
	const t = i18n.t;

	$effect(() => like.sync(item));

	const selected = $derived(selection.active && selection.has(item.id));
	const ratio = $derived((item.width ?? 4) / (item.height ?? 3));
	const imgVariant = $derived(item.kind === 'video' ? 'poster' : 'card');

	const label = $derived.by(() => {
		const who = item.mine ? t('mount.who.you') : t('mount.who.other', { name: item.guest.name });
		const kind = i18n.kind(item.kind);
		if (item.status === 'processing') return t('mount.aria.processing', { who, kind });
		if (item.status === 'failed') return t('mount.aria.failed', { who, kind });
		return t('mount.aria.ready', { who, kind }) + (item.caption ? `: ${item.caption}` : '');
	});

	function onCardClick(e: MouseEvent): void {
		if (!selection.active) return;
		e.preventDefault();
		selection.toggle(item.id);
	}

	function onLike(e: MouseEvent): void {
		e.preventDefault();
		e.stopPropagation();
		if (!canLike || item.status !== 'ready') return;
		like.toggle();
	}
</script>

<article class="card" class:selected class:selecting={selection.active} class:mine={item.mine}>
	<a class="media" href="/m/{item.id}" aria-label={label} onclick={onCardClick} style:aspect-ratio={ratio}>
		{#if item.status === 'ready'}
			<img
				src={fileUrl(item, imgVariant)}
				srcset={item.kind === 'video' ? undefined : `${fileUrl(item, 'thumb')} 480w, ${fileUrl(item, 'card')} 900w, ${fileUrl(item, 'web')} 1600w`}
				{sizes}
				alt=""
				width={item.width ?? 1600}
				height={item.height ?? 1200}
				loading={eager ? 'eager' : 'lazy'}
				decoding="async"
				class:loaded
				onload={() => (loaded = true)}
			/>
			{#if item.kind === 'video'}
				<span class="badge num"><Icon name="play" size={14} filled /> {formatDuration(item.duration)}</span>
			{/if}
		{:else if item.status === 'processing'}
			<span class="state">
				<span class="warming" aria-hidden="true"></span>
				<span>{t('mount.processing')}</span>
			</span>
		{:else}
			<span class="state state--failed"><Icon name="alert" size={20} /> {t('mount.failed')}</span>
		{/if}
		{#if selection.active}
			<span class="check" aria-hidden="true">{#if selected}<Icon name="check" size={16} />{/if}</span>
		{/if}
	</a>
	<footer>
		<span class="name">
			<Avatar guest={item.guest} size={22} />
			<span class="nametext">{item.guest.name}</span>{#if item.mine} <span class="you" aria-label={t('viewer.you')}><span class="you-text">{t('viewer.you')}</span></span>{/if}
		</span>
		<span class="stats">
			<button class="stat like" class:liked={like.liked} class:pop={like.pop} onclick={onLike} disabled={!canLike || item.status !== 'ready' || selection.active} aria-pressed={like.liked} aria-label={t('card.like')}>
				<Icon name="heart" size={16} filled={like.liked} />
				<span class="num">{like.count}</span>
			</button>
			<a class="stat" href="/m/{item.id}#comments-h" onclick={onCardClick} aria-label={t('card.comments')}>
				<Icon name="comment" size={16} />
				<span class="num">{item.comments}</span>
			</a>
		</span>
	</footer>
</article>

<style>
	.card {
		display: flex;
		flex-direction: column;
		background: var(--card);
		border-radius: var(--r-card);
		box-shadow: var(--shadow-card);
		overflow: hidden;
		break-inside: avoid;
		transition: transform var(--t-fast) var(--ease-out), box-shadow var(--t-fast) var(--ease-out);
	}

	.card:hover {
		transform: translateY(-2px);
		box-shadow: var(--shadow-card-hover);
	}

	.card.selected {
		box-shadow: 0 0 0 3px var(--teal), var(--shadow-card);
	}

	.media {
		position: relative;
		display: block;
		width: 100%;
		background: var(--bg-deep);
		overflow: hidden;
	}

	img {
		width: 100%;
		height: 100%;
		object-fit: cover;
		opacity: 0;
		transition: opacity 400ms var(--ease-out);
	}

	img.loaded {
		opacity: 1;
	}

	.badge {
		position: absolute;
		right: 10px;
		bottom: 10px;
		display: inline-flex;
		align-items: center;
		gap: 0.3rem;
		padding: 0.35rem 0.6rem;
		border-radius: 999px;
		font-size: var(--fs-1);
		font-weight: 700;
		color: #fff;
		background: rgba(27, 42, 40, 0.72);
	}

	.state {
		position: absolute;
		inset: 0;
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 0.4rem;
		font-size: var(--fs-2);
		font-weight: 600;
		color: var(--ink-70);
		background: var(--teal-soft);
	}

	.warming {
		position: absolute;
		inset: 0;
		background: radial-gradient(55% 55% at 50% 50%, var(--gold-soft), transparent 70%);
		animation: warm 2.4s var(--ease-out) infinite alternate;
	}

	@keyframes warm {
		from { opacity: 0.3; transform: scale(0.8); }
		to { opacity: 1; transform: scale(1.15); }
	}

	.state--failed {
		color: var(--coral-deep);
		background: var(--coral-soft);
	}

	.check {
		position: absolute;
		top: 10px;
		left: 10px;
		width: 28px;
		height: 28px;
		border-radius: 999px;
		display: grid;
		place-items: center;
		color: #fff;
		background: rgba(255, 255, 255, 0.35);
		box-shadow: inset 0 0 0 2px #fff, 0 2px 6px rgba(0, 0, 0, 0.25);
		backdrop-filter: blur(4px);
	}

	.selected .check {
		background: var(--teal);
	}

	footer {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 0.5rem;
		padding: 0.75rem 0.85rem 0.85rem;
	}

	.name {
		min-width: 0;
		display: inline-flex;
		align-items: center;
		gap: 0.4rem;
		font-size: var(--fs-3);
		font-weight: 700;
		white-space: nowrap;
	}

	.nametext {
		min-width: 0;
		overflow: hidden;
		text-overflow: ellipsis;
	}

	.you {
		display: inline-block;
		margin-left: 0.25rem;
		padding: 0.05rem 0.45rem;
		border-radius: 999px;
		font-size: var(--fs-1);
		font-weight: 700;
		background: var(--gold);
		vertical-align: 0.12em;
	}

	.stats {
		display: flex;
		gap: 0.35rem;
		flex: none;
	}

	.stat {
		display: inline-flex;
		align-items: center;
		gap: 0.3rem;
		min-height: 34px;
		padding: 0 0.65rem;
		border-radius: 999px;
		font-size: var(--fs-2);
		font-weight: 700;
		color: var(--ink);
		background: var(--bg);
		transition: background-color var(--t-fast) var(--ease-out), color var(--t-fast) var(--ease-out);
	}

	.stat:hover {
		background: var(--bg-deep);
	}

	.stat:disabled {
		cursor: default;
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

	@media (max-width: 480px) {
		footer {
			padding: 0.6rem 0.65rem 0.7rem;
		}
		.name {
			font-size: var(--fs-2);
		}
		.stat {
			padding: 0 0.5rem;
			min-height: 30px;
			font-size: var(--fs-1);
		}
		.name :global(.avatar) {
			display: none;
		}
		.you {
			width: 9px;
			height: 9px;
			padding: 0;
			margin-left: 0.15rem;
			vertical-align: 0.05em;
		}
		.you-text {
			position: absolute;
			width: 1px;
			height: 1px;
			overflow: hidden;
			clip: rect(0 0 0 0);
		}
	}
</style>
