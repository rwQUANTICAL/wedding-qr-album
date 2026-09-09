<script lang="ts">
	import { i18n } from '$lib/i18n/index.svelte';

	interface Props {
		tone?: 'page' | 'inline';
		sparkle?: boolean;
	}

	let { tone = 'page', sparkle = false }: Props = $props();
	const dust = [0.1, 0.22, 0.34, 0.46, 0.58, 0.7];
</script>

<footer class="credit {tone}" class:sparkle>
	{#if sparkle}
		<span class="fx" aria-hidden="true">
			<span class="ring r1"></span>
			<span class="ring r2"></span>
			<span class="comet"></span>
			{#each dust as d, i (i)}
				<span class="dust" style:--d="{d}s" style:--s="{i % 2 ? 3 : 2}px"></span>
			{/each}
		</span>
	{/if}
	<a href="https://quantical.com/en/" target="_blank" rel="noopener">
		<img src="/rwquantical-mark.png" alt="" width="20" height="20" loading="lazy" />
		<span class="text" class:shimmer={sparkle}>{i18n.t('footer.by')} rwQUANTICAL GmbH</span>
	</a>
</footer>

<style>
	.credit {
		position: relative;
		display: flex;
		justify-content: center;
		font-size: var(--fs-1);
		color: var(--ink-55);
	}

	.page {
		padding: 2.5rem 1rem 1.25rem;
	}

	.inline {
		padding: 0;
	}

	a {
		position: relative;
		display: inline-flex;
		align-items: center;
		gap: 0.4rem;
		padding: 0.3rem 0.6rem;
		opacity: 0.8;
		transition: opacity var(--t-fast) var(--ease-out);
	}

	a:hover {
		opacity: 1;
	}

	img {
		height: 18px;
		width: auto;
	}

	/* Schimmer, der einmal über den Schriftzug läuft */
	.shimmer {
		background: linear-gradient(100deg, var(--ink-55) 0 40%, var(--gold) 47%, #fff 50%, var(--gold) 53%, var(--ink-55) 60% 100%);
		background-size: 300% 100%;
		background-position: 100% 0;
		-webkit-background-clip: text;
		background-clip: text;
		color: transparent;
		animation: shimmer 1.6s cubic-bezier(0.4, 0, 0.2, 1) 1.9s 1 both;
	}

	@keyframes shimmer {
		from { background-position: 100% 0; }
		to { background-position: 0% 0; }
	}

	.fx {
		position: absolute;
		left: 50%;
		top: 50%;
		width: 0;
		height: 0;
		z-index: -1;
		pointer-events: none;
	}

	/* Zwei Energieringe, die vom Schriftzug nach aussen laufen */
	.ring {
		position: absolute;
		left: -140px;
		top: -22px;
		width: 280px;
		height: 44px;
		border-radius: 999px;
		border: 1px solid rgba(233, 196, 106, 0.9);
		box-shadow: 0 0 12px rgba(233, 196, 106, 0.5), inset 0 0 12px rgba(233, 196, 106, 0.25);
		opacity: 0;
		transform: scale(0.55);
		animation: ring 2.2s cubic-bezier(0.2, 0.7, 0.2, 1) 1 both;
	}

	.r1 { animation-delay: 1.6s; }
	.r2 { animation-delay: 1.95s; border-color: rgba(36, 157, 143, 0.7); box-shadow: 0 0 10px rgba(36, 157, 143, 0.4); }

	@keyframes ring {
		0% { opacity: 0; transform: scale(0.55); }
		15% { opacity: 0.9; }
		100% { opacity: 0; transform: scale(2.6); }
	}

	/* Komet: Lichtkopf mit Schweif, umrundet den Schriftzug anderthalb Mal und zieht dann davon */
	.comet,
	.dust {
		position: absolute;
		left: 0;
		top: 0;
		offset-path: path('M -150 0 A 150 32 0 1 1 150 0 A 150 32 0 1 1 -150 0');
		offset-rotate: auto;
		opacity: 0;
	}

	.comet {
		width: 90px;
		height: 3px;
		margin-left: -90px;
		border-radius: 999px;
		background: linear-gradient(90deg, transparent, rgba(233, 196, 106, 0.6) 55%, #fff);
		filter: drop-shadow(0 0 6px rgba(233, 196, 106, 0.9)) drop-shadow(0 0 2px #fff);
		animation: comet 3.2s cubic-bezier(0.55, 0, 0.3, 1) 0.2s 1 both;
	}

	.comet::after {
		content: '';
		position: absolute;
		right: -3px;
		top: -2px;
		width: 7px;
		height: 7px;
		border-radius: 999px;
		background: #fff;
		box-shadow: 0 0 10px 3px rgba(255, 255, 255, 0.9), 0 0 18px 6px rgba(233, 196, 106, 0.6);
	}

	@keyframes comet {
		0% { offset-distance: 0%; opacity: 0; }
		8% { opacity: 1; }
		62% { offset-distance: 150%; opacity: 1; }
		100% { offset-distance: 150%; opacity: 0; transform: translateX(560px) translateY(-220px) scale(0.6); }
	}

	/* Staub, der dem Kometen folgt und verglimmt */
	.dust {
		width: var(--s);
		height: var(--s);
		border-radius: 999px;
		background: #fff;
		box-shadow: 0 0 6px 2px rgba(233, 196, 106, 0.8);
		animation: dust 3.2s cubic-bezier(0.55, 0, 0.3, 1) calc(0.2s + var(--d)) 1 both;
	}

	@keyframes dust {
		0% { offset-distance: 0%; opacity: 0; }
		10% { opacity: 0.9; }
		50% { opacity: 0.7; }
		62% { offset-distance: 150%; opacity: 0; transform: translateY(-14px); }
		100% { offset-distance: 150%; opacity: 0; }
	}

	@media (prefers-reduced-motion: reduce) {
		.fx { display: none; }
		.shimmer { animation: none; color: var(--ink-55); background: none; }
	}
</style>
