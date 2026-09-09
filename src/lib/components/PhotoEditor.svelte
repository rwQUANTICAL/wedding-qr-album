<script lang="ts">
	import { fileUrl } from '$lib/media-url';
	import type { MediaView } from '$lib/server/media';
	import Icon from './Icon.svelte';
	import { i18n } from '$lib/i18n/index.svelte';

	interface Crop {
		x: number;
		y: number;
		w: number;
		h: number;
	}

	interface Props {
		item: MediaView;
		onclose: () => void;
		onsaved: () => void;
	}

	let { item, onclose, onsaved }: Props = $props();
	const t = i18n.t;

	let rotation = $state(0);
	let crop = $state<Crop>({ x: 0, y: 0, w: 1, h: 1 });
	let saving = $state(false);
	let error = $state<string | null>(null);
	let stage: HTMLDivElement;
	let canvas: HTMLCanvasElement;
	let source = $state<HTMLImageElement | null>(null);
	let natural = $state({ w: 3, h: 2 });

	$effect(() => {
		const image = new Image();
		image.onload = () => {
			natural = { w: image.naturalWidth, h: image.naturalHeight };
			source = image;
		};
		image.src = fileUrl(item, 'web');
	});

	$effect(() => {
		if (!source || !canvas) return;
		const swap = rotation % 180 !== 0;
		canvas.width = swap ? natural.h : natural.w;
		canvas.height = swap ? natural.w : natural.h;
		const ctx = canvas.getContext('2d');
		if (!ctx) return;
		ctx.save();
		ctx.translate(canvas.width / 2, canvas.height / 2);
		ctx.rotate((rotation * Math.PI) / 180);
		ctx.drawImage(source, -natural.w / 2, -natural.h / 2);
		ctx.restore();
	});

	const rotatedAspect = $derived(rotation % 180 === 0 ? natural.w / natural.h : natural.h / natural.w);
	const isCropped = $derived(crop.x > 0.001 || crop.y > 0.001 || crop.w < 0.999 || crop.h < 0.999);

	type Handle = 'move' | 'nw' | 'ne' | 'sw' | 'se';
	let drag: { handle: Handle; startX: number; startY: number; start: Crop } | null = null;
	const MIN = 0.12;

	function rotate(): void {
		rotation = (rotation + 90) % 360;
		crop = { x: 0, y: 0, w: 1, h: 1 };
	}

	function reset(): void {
		crop = { x: 0, y: 0, w: 1, h: 1 };
	}

	function down(handle: Handle, e: PointerEvent): void {
		e.preventDefault();
		(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
		drag = { handle, startX: e.clientX, startY: e.clientY, start: { ...crop } };
	}

	function move(e: PointerEvent): void {
		if (!drag) return;
		const rect = stage.getBoundingClientRect();
		const dx = (e.clientX - drag.startX) / rect.width;
		const dy = (e.clientY - drag.startY) / rect.height;
		const s = drag.start;
		let next: Crop = { ...s };
		switch (drag.handle) {
			case 'move':
				next.x = clamp(s.x + dx, 0, 1 - s.w);
				next.y = clamp(s.y + dy, 0, 1 - s.h);
				break;
			case 'nw':
				next.x = clamp(s.x + dx, 0, s.x + s.w - MIN);
				next.y = clamp(s.y + dy, 0, s.y + s.h - MIN);
				next.w = s.x + s.w - next.x;
				next.h = s.y + s.h - next.y;
				break;
			case 'ne':
				next.y = clamp(s.y + dy, 0, s.y + s.h - MIN);
				next.w = clamp(s.w + dx, MIN, 1 - s.x);
				next.h = s.y + s.h - next.y;
				break;
			case 'sw':
				next.x = clamp(s.x + dx, 0, s.x + s.w - MIN);
				next.w = s.x + s.w - next.x;
				next.h = clamp(s.h + dy, MIN, 1 - s.y);
				break;
			case 'se':
				next.w = clamp(s.w + dx, MIN, 1 - s.x);
				next.h = clamp(s.h + dy, MIN, 1 - s.y);
				break;
		}
		crop = next;
	}

	function up(): void {
		drag = null;
	}

	function clamp(v: number, lo: number, hi: number): number {
		return Math.min(hi, Math.max(lo, v));
	}

	async function save(): Promise<void> {
		saving = true;
		error = null;
		try {
			const res = await fetch(`/api/media/${item.id}`, {
				method: 'PATCH',
				headers: { 'content-type': 'application/json' },
				body: JSON.stringify({ rotation, crop: isCropped ? crop : null })
			});
			if (!res.ok) throw new Error((await res.json()).message ?? t('editor.error'));
			onsaved();
		} catch (err) {
			error = err instanceof Error ? err.message : t('editor.error');
		} finally {
			saving = false;
		}
	}
</script>

<div class="editor" role="dialog" aria-modal="true" aria-labelledby="editor-h">
	<header>
		<button class="pill pill--soft light" onclick={onclose}><Icon name="close" size={18} /> {t('editor.cancel')}</button>
		<h2 id="editor-h">{t('editor.title')}</h2>
		<button class="pill pill--gold" onclick={save} disabled={saving}>{saving ? t('editor.saving') : t('editor.save')}</button>
	</header>

	<div class="work">
		<div class="stage" bind:this={stage} style:aspect-ratio={rotatedAspect}>
			<canvas bind:this={canvas} class="canvas"></canvas>
			<div class="shade" style:clip-path="polygon(0 0, 100% 0, 100% 100%, 0 100%, 0 {crop.y * 100}%, {crop.x * 100}% {crop.y * 100}%, {crop.x * 100}% {(crop.y + crop.h) * 100}%, {(crop.x + crop.w) * 100}% {(crop.y + crop.h) * 100}%, {(crop.x + crop.w) * 100}% {crop.y * 100}%, 0 {crop.y * 100}%)"></div>
			<div
				class="box"
				style:left="{crop.x * 100}%"
				style:top="{crop.y * 100}%"
				style:width="{crop.w * 100}%"
				style:height="{crop.h * 100}%"
				onpointerdown={(e) => down('move', e)}
				onpointermove={move}
				onpointerup={up}
				onpointercancel={up}
				role="presentation"
			>
				{#each ['nw', 'ne', 'sw', 'se'] as const as h}
					<button
						class="handle {h}"
						onpointerdown={(e) => { e.stopPropagation(); down(h, e); }}
						onpointermove={move}
						onpointerup={up}
						onpointercancel={up}
						aria-label={t('editor.handle', { h })}
					></button>
				{/each}
			</div>
		</div>
	</div>

	<footer>
		<button class="pill pill--soft light" onclick={rotate}><Icon name="rotate" size={18} /> {t('editor.rotate')}</button>
		<button class="pill pill--soft light" onclick={reset} disabled={!isCropped}><Icon name="crop" size={18} /> {t('editor.resetCrop')}</button>
	</footer>
	<p class="help">{t('editor.help')}</p>
	{#if error}<p class="error" role="alert">{error}</p>{/if}
</div>

<style>
	.editor {
		position: fixed;
		inset: 0;
		z-index: 30;
		display: flex;
		flex-direction: column;
		background: var(--room);
		color: var(--cream);
		padding-bottom: var(--safe-bottom);
	}

	header,
	footer {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 0.5rem;
		padding: 0.75rem 1rem;
	}

	header h2 {
		font-size: var(--fs-3);
		font-weight: 700;
	}

	.work {
		flex: 1;
		min-height: 0;
		display: grid;
		place-items: center;
		padding: 1rem 1.5rem;
	}

	.stage {
		position: relative;
		max-width: 100%;
		max-height: 100%;
		width: 100%;
		background: var(--cream);
		padding: 0;
		border-radius: 6px;
		touch-action: none;
		user-select: none;
		-webkit-user-select: none;
	}

	.canvas {
		position: absolute;
		inset: 0;
		width: 100%;
		height: 100%;
		pointer-events: none;
	}

	.shade {
		position: absolute;
		inset: 0;
		background: rgba(15, 58, 53, 0.62);
		pointer-events: none;
	}

	.box {
		position: absolute;
		box-shadow: 0 0 0 2px var(--gold);
		cursor: move;
	}

	.box::before,
	.box::after {
		content: '';
		position: absolute;
		inset: 0;
		pointer-events: none;
		border: 0 solid rgba(253, 240, 213, 0.35);
	}

	.box::before {
		border-width: 0 1px;
		left: 33.33%;
		right: 33.33%;
	}

	.box::after {
		border-width: 1px 0;
		top: 33.33%;
		bottom: 33.33%;
	}

	.handle {
		position: absolute;
		width: 28px;
		height: 28px;
		border-radius: 999px;
		background: var(--gold);
		box-shadow: 0 2px 6px rgba(0, 0, 0, 0.4);
		touch-action: none;
	}

	.nw { top: -14px; left: -14px; cursor: nwse-resize; }
	.ne { top: -14px; right: -14px; cursor: nesw-resize; }
	.sw { bottom: -14px; left: -14px; cursor: nesw-resize; }
	.se { bottom: -14px; right: -14px; cursor: nwse-resize; }

	.editor :global(.pill--soft.light) {
		color: var(--cream);
		background: rgba(253, 240, 213, 0.12);
	}

	.help {
		padding: 0 1rem 0.75rem;
		text-align: center;
		font-size: var(--fs-1);
		color: rgba(253, 240, 213, 0.62);
	}

	.error {
		padding: 0 1rem 0.75rem;
		text-align: center;
		font-size: var(--fs-2);
		color: #f4b39f;
	}
</style>
