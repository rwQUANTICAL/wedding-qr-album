<script lang="ts">
	interface Props {
		text: string;
		yes: string;
		no: string;
		busy?: boolean;
		onyes: () => void;
		onno: () => void;
	}

	let { text, yes, no, busy = false, onyes, onno }: Props = $props();
</script>

<div class="sheet" role="alertdialog" aria-labelledby="confirm-h">
	<p id="confirm-h">{text}</p>
	<div class="row">
		<button class="pill pill--coral" onclick={onyes} disabled={busy}>{yes}</button>
		<button class="pill pill--soft" onclick={onno}>{no}</button>
	</div>
</div>

<style>
	.sheet {
		position: fixed;
		left: 0.75rem;
		right: 0.75rem;
		bottom: calc(0.75rem + var(--safe-bottom));
		z-index: 40;
		padding: 1rem;
		border-radius: var(--r-card);
		background: var(--card);
		color: var(--ink);
		box-shadow: var(--shadow-card-hover);
	}

	p {
		font-weight: 700;
	}

	.row {
		display: flex;
		gap: 0.5rem;
		margin-top: 0.75rem;
	}

	@media (min-width: 640px) {
		.sheet {
			left: 50%;
			right: auto;
			width: 440px;
			transform: translateX(-50%);
		}
	}
</style>
