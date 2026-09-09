<script lang="ts">
	import { invalidateAll } from '$app/navigation';
	import Icon from '$lib/components/Icon.svelte';
	import ConfirmSheet from '$lib/components/ConfirmSheet.svelte';
	import EventCard from '$lib/components/EventCard.svelte';
	import { i18n } from '$lib/i18n/index.svelte';
	import { formatDayTime } from '$lib/format';

	let { data } = $props();
	let copied = $state(false);
	let busy = $state(false);
	let confirmGuest = $state<{ id: string; name: string } | null>(null);
	let error = $state<string | null>(null);
	let copiedGuest = $state<string | null>(null);
	const t = i18n.t;

	async function copyRecovery(id: string, url: string): Promise<void> {
		await navigator.clipboard.writeText(url);
		copiedGuest = id;
		setTimeout(() => (copiedGuest = null), 1500);
	}

	const gb = (bytes: number) => (bytes / 1024 ** 3).toFixed(1);
	const pct = (part: number, total: number) => (total > 0 ? Math.round((part / total) * 100) : 0);
	const diskPct = $derived(pct(data.system.diskUsed, data.system.diskTotal));
	const memPct = $derived(pct(data.system.memUsed, data.system.memTotal));
	const loadPct = $derived(Math.min(100, Math.round((data.system.load1 / data.system.cpus) * 100)));

	async function copy(): Promise<void> {
		await navigator.clipboard.writeText(data.inviteUrl);
		copied = true;
		setTimeout(() => (copied = false), 1500);
	}

	async function call(url: string, init: RequestInit): Promise<boolean> {
		busy = true;
		error = null;
		const res = await fetch(url, init);
		busy = false;
		if (!res.ok) {
			error = (await res.json().catch(() => ({}))).message ?? t('error.generic');
			return false;
		}
		await invalidateAll();
		return true;
	}

	async function removeGuest(): Promise<void> {
		if (!confirmGuest) return;
		if (await call(`/api/guests/${confirmGuest.id}`, { method: 'DELETE' })) confirmGuest = null;
	}

	async function setAdmin(id: string, isAdmin: boolean): Promise<void> {
		await call(`/api/guests/${id}`, {
			method: 'PATCH',
			headers: { 'content-type': 'application/json' },
			body: JSON.stringify({ isAdmin })
		});
	}
</script>

<svelte:head><title>{t('admin.title')} · {data.eventTitle}</title></svelte:head>

<section class="admin">
	<h1>{t('admin.title')}</h1>

	<div class="cards">
		<div class="card qrcard">
			<a class="qr" href="/admin/qr" aria-label={t('admin.print')}>{@html data.qrSvg}</a>
			<div class="qrbody">
				<h2>{t('admin.qr')}</h2>
				<p class="url">{data.inviteUrl.replace(/^https?:\/\//, '').replace(/\/$/, '')}</p>
				<div class="row">
					<button class="pill pill--gold small" onclick={copy}
						>{copied ? t('admin.copied') : t('admin.copy')}</button
					>
					<a class="pill pill--soft small" href="/admin/qr"
						><Icon name="qr" size={14} /> {t('admin.print')}</a
					>
					<a class="pill pill--soft small" href="/api/qr?format=png" download
						><Icon name="download" size={14} /> PNG</a
					>
				</div>
			</div>
		</div>

		<div class="card stats">
			<dl>
				<div>
					<dt>{t('admin.photos')}</dt>
					<dd class="num">{data.stats.photos}</dd>
				</div>
				<div>
					<dt>{t('admin.videos')}</dt>
					<dd class="num">{data.stats.videos}</dd>
				</div>
				<div>
					<dt>{t('admin.guests')}</dt>
					<dd class="num">{data.stats.guests}</dd>
				</div>
			</dl>
			<a class="pill pill--ink small" href="/api/export"
				><Icon name="zip" size={16} /> {t('admin.export')}</a
			>
		</div>

		<div class="card system">
			<div class="meter" class:warn={diskPct >= 80}>
				<div class="mhead">
					<span>{t('admin.disk')}</span><span class="num"
						>{gb(data.system.diskUsed)} / {gb(data.system.diskTotal)} GB · {diskPct} %</span
					>
				</div>
				<div class="bar"><span style:transform="scaleX({diskPct / 100})"></span></div>
			</div>
			<div class="meter" class:warn={memPct >= 85}>
				<div class="mhead">
					<span>{t('admin.memory')}</span><span class="num"
						>{gb(data.system.memUsed)} / {gb(data.system.memTotal)} GB · {memPct} %</span
					>
				</div>
				<div class="bar"><span style:transform="scaleX({memPct / 100})"></span></div>
			</div>
			<div class="meter" class:warn={loadPct >= 85}>
				<div class="mhead">
					<span>{t('admin.load')}</span><span class="num"
						>{data.system.load1.toFixed(2)} / {data.system.cpus} CPU · {loadPct} %</span
					>
				</div>
				<div class="bar"><span style:transform="scaleX({loadPct / 100})"></span></div>
			</div>
		</div>

		<EventCard title={data.eventTitle} photo={data.couplePhoto} />
	</div>

	<h2 class="list-h">{t('admin.guestsTitle')} <span class="num">{data.guests.length}</span></h2>
	<p class="fine">{t('admin.guestsFine')}</p>
	{#if error}<p class="error" role="alert">{error}</p>{/if}
	<ul class="guests">
		{#each data.guests as g (g.id)}
			<li class="card guest" class:isme={g.id === data.meId}>
				<div class="ginfo">
					<span class="gname">
						{g.name}
						{#if g.isAdmin}<span class="badge">{t('admin.adminBadge')}</span>{/if}
						{#if g.id === data.meId}<span class="badge me">{t('admin.me')}</span>{/if}
					</span>
					<span class="gmeta num">
						{i18n.n('count.photo', g.photos)}{#if g.videos}
							· {i18n.n('count.video', g.videos)}{/if} · {g.comments}
						<Icon name="comment" size={12} /> · {t('admin.joined', {
							time: formatDayTime(g.createdAt, i18n.locale)
						})}
					</span>
				</div>
				<div class="gactions">
					<button
						class="pill pill--soft small"
						onclick={() => copyRecovery(g.id, g.recoveryUrl)}
						disabled={busy}
					>
						<Icon name="send" size={14} />
						{copiedGuest === g.id ? t('admin.recoveryCopied') : t('admin.recovery')}
					</button>
					{#if g.id !== data.meId || !g.isAdmin}
						<button
							class="pill pill--soft small"
							onclick={() => setAdmin(g.id, !g.isAdmin)}
							disabled={busy}
						>
							<Icon name="user" size={14} />
							{g.isAdmin ? t('admin.removeAdmin') : t('admin.makeAdmin')}
						</button>
					{/if}
					{#if g.id !== data.meId}
						<button
							class="pill pill--soft small danger"
							onclick={() => (confirmGuest = { id: g.id, name: g.name })}
							disabled={busy}
							aria-label={t('admin.deleteGuest')}
						>
							<Icon name="trash" size={14} />
						</button>
					{/if}
				</div>
			</li>
		{/each}
	</ul>
</section>

{#if confirmGuest}
	<ConfirmSheet
		text={t('admin.deleteGuestConfirm', { name: confirmGuest.name })}
		yes={t('viewer.confirmYes')}
		no={t('viewer.confirmNo')}
		{busy}
		onyes={removeGuest}
		onno={() => (confirmGuest = null)}
	/>
{/if}

<style>
	.admin {
		max-width: 1100px;
		margin: 0 auto;
		padding: 1rem 0.75rem 3rem;
	}

	h1 {
		font-size: var(--fs-5);
		font-weight: 700;
		margin-bottom: 0.8rem;
	}

	.cards {
		display: grid;
		gap: 0.75rem;
		grid-template-columns: 1fr;
	}

	@media (min-width: 720px) {
		.cards {
			grid-template-columns: 3fr 2fr 2fr;
		}

		.cards :global(.event) {
			grid-column: 1 / -1;
		}
	}

	.card {
		padding: 0.9rem 1rem;
	}

	.card h2 {
		font-size: var(--fs-2);
		font-weight: 700;
	}

	.qrcard {
		display: flex;
		align-items: center;
		gap: 0.9rem;
	}

	.qr {
		flex: none;
		width: 96px;
		height: 96px;
		padding: 6px;
		border-radius: 10px;
		background: #fff;
		box-shadow: inset 0 0 0 1px var(--ink-08);
	}

	.qr :global(svg) {
		width: 100%;
		height: 100%;
		display: block;
	}

	.qrbody {
		min-width: 0;
		display: flex;
		flex-direction: column;
		gap: 0.3rem;
	}

	.url {
		font-size: var(--fs-1);
		word-break: break-all;
		color: var(--ink-55);
	}

	.row {
		display: flex;
		gap: 0.4rem;
		margin-top: 0.2rem;
		flex-wrap: wrap;
	}

	.pill.small {
		min-height: 34px;
		padding: 0 0.7rem;
		font-size: var(--fs-1);
	}

	.stats {
		display: flex;
		flex-direction: column;
		justify-content: space-between;
		gap: 0.6rem;
	}

	dl {
		display: grid;
		grid-template-columns: repeat(3, 1fr);
		gap: 0.5rem;
		margin: 0;
	}

	dt {
		font-size: var(--fs-1);
		color: var(--ink-55);
	}

	dd {
		margin: 0;
		font-size: var(--fs-5);
		font-weight: 700;
		line-height: 1.1;
	}

	.stats .pill {
		align-self: flex-start;
	}

	.system {
		display: flex;
		flex-direction: column;
		justify-content: center;
		gap: 0.55rem;
	}

	.mhead {
		display: flex;
		justify-content: space-between;
		gap: 0.5rem;
		font-size: var(--fs-1);
		color: var(--ink-70);
	}

	.mhead span:first-child {
		font-weight: 700;
		color: var(--ink);
	}

	.bar {
		height: 6px;
		margin-top: 0.25rem;
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
	}

	.warn .bar span {
		background: var(--coral);
	}

	.list-h {
		margin: 1.5rem 0 0.3rem;
		font-size: var(--fs-3);
		font-weight: 700;
	}

	.list-h span {
		color: var(--ink-55);
		margin-left: 0.3rem;
	}

	.fine {
		font-size: var(--fs-1);
		color: var(--ink-55);
	}

	.error {
		margin: 0.5rem 0;
		font-size: var(--fs-2);
		color: var(--coral-deep);
	}

	.guests {
		list-style: none;
		margin: 0.6rem 0 0;
		padding: 0;
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
	}

	.guest {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 0.75rem;
		padding: 0.6rem 0.9rem;
		flex-wrap: wrap;
	}

	.guest.isme {
		box-shadow:
			0 0 0 2px var(--gold),
			var(--shadow-card);
	}

	.ginfo {
		display: flex;
		flex-direction: column;
		min-width: 0;
		gap: 0.1rem;
	}

	.gname {
		font-weight: 700;
		display: flex;
		align-items: center;
		gap: 0.4rem;
		flex-wrap: wrap;
	}

	.badge {
		padding: 0.05rem 0.5rem;
		border-radius: 999px;
		font-size: var(--fs-1);
		font-weight: 700;
		color: #fff;
		background: var(--teal);
	}

	.badge.me {
		color: var(--ink);
		background: var(--gold);
	}

	.gmeta {
		display: inline-flex;
		align-items: center;
		gap: 0.3rem;
		font-size: var(--fs-1);
		color: var(--ink-55);
		flex-wrap: wrap;
	}

	.gactions {
		display: flex;
		gap: 0.4rem;
		flex: none;
	}

	.pill.small.danger {
		width: 34px;
		padding: 0;
	}

	.pill.small.danger:hover {
		color: var(--coral-deep);
		background: var(--coral-soft);
	}
</style>
