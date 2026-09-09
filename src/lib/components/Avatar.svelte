<script lang="ts">
	import { avatarUrl } from '$lib/media-url';

	interface Props {
		guest: { id: string; name: string; avatar: number };
		size?: number;
	}

	let { guest, size = 24 }: Props = $props();
	const url = $derived(avatarUrl(guest));
	const initial = $derived((guest.name.trim()[0] ?? '?').toUpperCase());
</script>

{#if url}
	<img class="avatar" src={url} alt="" width={size} height={size} style:--s="{size}px" decoding="async" loading="lazy" />
{:else}
	<span class="avatar initial" style:--s="{size}px" aria-hidden="true">{initial}</span>
{/if}

<style>
	.avatar {
		flex: none;
		width: var(--s);
		height: var(--s);
		border-radius: 999px;
		object-fit: cover;
		background: var(--bg-deep);
	}

	.initial {
		display: inline-grid;
		place-items: center;
		font-size: calc(var(--s) * 0.5);
		font-weight: 700;
		line-height: 1;
		color: var(--ink);
		background: var(--gold);
	}
</style>
