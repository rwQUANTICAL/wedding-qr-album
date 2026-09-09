<script lang="ts">
	import Icon from './Icon.svelte';

	interface Props {
		src: string | null;
		size?: number;
	}

	let { src, size = 40 }: Props = $props();
</script>

{#if src}
	<img
		class="couple"
		{src}
		alt=""
		width={size}
		height={size}
		style:width="{size}px"
		style:height="{size}px"
		decoding="async"
	/>
{:else}
	<span class="couple mark" style:width="{size}px" style:height="{size}px" aria-hidden="true">
		<Icon name="rings" size={Math.round(size * 0.55)} />
	</span>
{/if}

<style>
	.couple {
		flex: none;
		border-radius: 999px;
		object-fit: cover;
		box-shadow:
			0 4px 12px rgba(27, 42, 40, 0.25),
			0 0 0 2px var(--card);
	}

	.mark {
		display: grid;
		place-items: center;
		color: var(--room);
		background: linear-gradient(145deg, var(--gold), #f3d79a);
	}
</style>
