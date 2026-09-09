<script lang="ts">
	import type { CommentView } from '$lib/server/media';
	import Icon from './Icon.svelte';
	import { formatTime } from '$lib/format';
	import { i18n } from '$lib/i18n/index.svelte';
	import { LIMITS } from '$lib/limits';
	import Avatar from './Avatar.svelte';

	interface Props {
		mediaId: string;
		comments: CommentView[];
		canWrite: boolean;
		isAdmin: boolean;
	}

	let { mediaId, comments = $bindable(), canWrite, isAdmin }: Props = $props();
	let text = $state('');
	let sending = $state(false);
	let error = $state<string | null>(null);
	const t = i18n.t;

	async function send(e: SubmitEvent): Promise<void> {
		e.preventDefault();
		const value = text.trim();
		if (!value || sending) return;
		sending = true;
		error = null;
		try {
			const res = await fetch(`/api/media/${mediaId}/comments`, {
				method: 'POST',
				headers: { 'content-type': 'application/json' },
				body: JSON.stringify({ text: value })
			});
			if (!res.ok) throw new Error((await res.json()).message ?? t('comments.error'));
			const { comment } = await res.json();
			comments = [...comments, comment];
			text = '';
		} catch (err) {
			error = err instanceof Error ? err.message : t('comments.error');
		} finally {
			sending = false;
		}
	}

	async function remove(id: string): Promise<void> {
		const res = await fetch(`/api/media/${mediaId}/comments`, {
			method: 'DELETE',
			headers: { 'content-type': 'application/json' },
			body: JSON.stringify({ commentId: id })
		});
		if (res.ok) comments = comments.filter((c) => c.id !== id);
		else error = (await res.json().catch(() => ({}))).message ?? t('comments.error');
	}
</script>

<section class="comments" aria-labelledby="comments-h">
	<h2 id="comments-h">{t('comments.title')} <span class="num count">{comments.length}</span></h2>

	{#if comments.length === 0}
		<p class="empty">{t('comments.empty')}</p>
	{:else}
		<ul>
			{#each comments as c (c.id)}
				<li class:mine={c.mine}>
					<div class="head">
						<Avatar guest={c.guest} size={20} />
						<span class="who">{c.guest.name}{#if c.mine}<span class="dot" aria-hidden="true"></span>{/if}</span>
						<time class="num" datetime={c.createdAt}>{formatTime(c.createdAt, i18n.locale)}</time>
						{#if c.mine || isAdmin}
							<button class="del" onclick={() => remove(c.id)} aria-label={t('comments.delete')}><Icon name="trash" size={15} /></button>
						{/if}
					</div>
					<p>{c.text}</p>
				</li>
			{/each}
		</ul>
	{/if}

	{#if canWrite}
		<form onsubmit={send}>
			<input class="field" bind:value={text} maxlength={LIMITS.commentChars} placeholder={t('comments.placeholder')} aria-label={t('comments.label')} autocomplete="off" />
			<button class="send" type="submit" disabled={!text.trim() || sending} aria-label={t('comments.send')}><Icon name="send" size={20} /></button>
		</form>
		{#if error}<p class="error" role="alert">{error}</p>{/if}
	{/if}
</section>

<style>
	.comments {
		padding: 1.25rem 0 0;
	}

	h2 {
		font-size: var(--fs-2);
		font-weight: 700;
		letter-spacing: 0.02em;
		color: var(--ink-70);
	}

	.count {
		margin-left: 0.3rem;
		color: var(--ink-55);
		font-weight: 600;
	}

	.empty {
		margin-top: 0.6rem;
		font-size: var(--fs-2);
		color: var(--ink-55);
	}

	ul {
		list-style: none;
		margin: 0.6rem 0 0;
		padding: 0;
		display: flex;
		flex-direction: column;
		gap: 0.6rem;
	}

	li {
		padding: 0.65rem 0.85rem;
		border-radius: 14px;
		background: var(--card);
		box-shadow: var(--shadow-card);
	}


	.head {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		font-size: var(--fs-1);
		color: var(--ink-55);
	}

	.who {
		font-weight: 700;
		color: var(--ink);
	}

	.dot {
		display: inline-block;
		width: 8px;
		height: 8px;
		margin-left: 0.35rem;
		border-radius: 999px;
		background: var(--gold);
		vertical-align: 0.05em;
	}

	.del {
		margin-left: auto;
		color: var(--ink-55);
		padding: 0.2rem;
	}

	.del:hover {
		color: var(--coral);
	}

	li p {
		margin-top: 0.2rem;
		font-size: var(--fs-2);
		line-height: 1.45;
		overflow-wrap: anywhere;
	}

	form {
		display: flex;
		gap: 0.5rem;
		margin-top: 0.9rem;
	}

	.send {
		flex: none;
		width: 48px;
		height: 48px;
		border-radius: var(--r-field);
		display: grid;
		place-items: center;
		background: var(--ink);
		color: var(--cream);
		transition: opacity var(--t-fast) var(--ease-out), transform var(--t-fast) var(--ease-out);
	}

	.send:active {
		transform: scale(0.95);
	}

	.send:disabled {
		opacity: 0.3;
		cursor: default;
	}

	.error {
		margin-top: 0.4rem;
		font-size: var(--fs-1);
		color: var(--coral-deep);
	}
</style>
