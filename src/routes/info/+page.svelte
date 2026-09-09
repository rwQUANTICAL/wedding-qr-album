<script lang="ts">
	import Icon from '$lib/components/Icon.svelte';
	import { i18n } from '$lib/i18n/index.svelte';

	let { data } = $props();
	const t = i18n.t;
</script>

<svelte:head><title>{t('info.title')} · {data.eventTitle}</title></svelte:head>

<section class="info">
	<div class="card hero">
		<div class="intro">
			<a
				class="logo"
				href="https://quantical.com/en/"
				target="_blank"
				rel="noopener"
				aria-label={t('info.visit')}
			>
				<img src="/rwquantical.png" alt="rwQUANTICAL" width="720" height="131" loading="lazy" />
			</a>
			<p class="made">{t('info.made', { couple: data.eventTitle })}</p>
		</div>
		<img
			class="office"
			src="/office.webp"
			alt={t('info.imageAlt')}
			width="1400"
			height="788"
			decoding="async"
		/>
	</div>

	<div class="card contact">
		<h2>{t('info.contactTitle')}</h2>
		<p>{t('info.contactApp')} <a href="mailto:info@quantical.com">info@quantical.com</a></p>
		<p>
			{t('info.contactProjects')}
			<a href="https://quantical.com/de/" target="_blank" rel="noopener">quantical.com</a>
		</p>
	</div>

	<div class="card about">
		<h2>{t('info.appTitle')}</h2>
		<ul>
			<li><Icon name="upload" size={18} /><span>{t('info.p1')}</span></li>
			<li><Icon name="grid" size={18} /><span>{t('info.p2')}</span></li>
			<li><Icon name="zip" size={18} /><span>{t('info.p3', { couple: data.eventTitle })}</span></li>
			<li><Icon name="download" size={18} /><span>{t('info.p4')}</span></li>
		</ul>
	</div>
</section>

<style>
	.info {
		max-width: 720px;
		margin: 0 auto;
		padding: 1rem 0.75rem 0;
		display: flex;
		flex-direction: column;
		gap: 0.75rem;
	}

	.card {
		padding: 1rem 1.1rem;
	}

	.hero {
		padding: 0;
		overflow: hidden;
	}

	.intro {
		display: flex;
		align-items: center;
		gap: 1rem;
		padding: 1rem 1.1rem;
	}

	.logo {
		flex: none;
		width: 110px;
		opacity: 0.9;
	}

	.logo img {
		width: 100%;
		height: auto;
	}

	.made {
		font-size: var(--fs-2);
		line-height: 1.45;
		color: var(--ink-70);
	}

	.office {
		width: 100%;
		height: 180px;
		object-fit: cover;
	}

	@media (min-width: 640px) {
		.office {
			height: 240px;
		}
		.logo {
			width: 140px;
		}
	}

	h2 {
		font-size: var(--fs-2);
		font-weight: 700;
		margin-bottom: 0.5rem;
	}

	ul {
		list-style: none;
		margin: 0;
		padding: 0;
		display: flex;
		flex-direction: column;
		gap: 0.55rem;
	}

	li {
		display: flex;
		align-items: flex-start;
		gap: 0.65rem;
		font-size: var(--fs-2);
		line-height: 1.45;
		color: var(--ink-70);
	}

	li :global(svg) {
		flex: none;
		margin-top: 0.15rem;
		color: var(--teal-deep);
	}

	.contact p {
		font-size: var(--fs-2);
		line-height: 1.5;
		color: var(--ink-70);
	}

	.contact p + p {
		margin-top: 0.35rem;
	}

	.contact a {
		font-weight: 700;
		color: var(--teal-deep);
		text-decoration: underline;
		text-underline-offset: 3px;
		text-decoration-color: var(--teal-soft);
	}

	.contact a:hover {
		text-decoration-color: var(--teal);
	}
</style>
