<script lang="ts">
	export type IconName =
		| 'heart'
		| 'comment'
		| 'download'
		| 'trash'
		| 'rotate'
		| 'crop'
		| 'pencil'
		| 'close'
		| 'back'
		| 'upload'
		| 'check'
		| 'alert'
		| 'play'
		| 'plus'
		| 'user'
		| 'grid'
		| 'film'
		| 'send'
		| 'qr'
		| 'zip'
		| 'info'
		| 'rings';

	interface Props {
		name: IconName;
		size?: number;
		filled?: boolean;
		label?: string;
	}

	let { name, size = 22, filled = false, label }: Props = $props();

	const paths: Record<IconName, string> = {
		heart:
			'M12 20.5s-7.2-4.5-9.4-9A5.3 5.3 0 0 1 12 6.4a5.3 5.3 0 0 1 9.4 5.1c-2.2 4.5-9.4 9-9.4 9z',
		comment: 'M20.5 12a8.5 8.5 0 0 1-12.4 7.6L3.5 20.5l1-4.4A8.5 8.5 0 1 1 20.5 12z',
		download: 'M12 4v11M7.5 10.5 12 15l4.5-4.5M4.5 20h15',
		trash: 'M4 7h16M9.5 7V4.5h5V7M6.5 7l.9 12.5h9.2L17.5 7',
		rotate: 'M19.5 12a7.5 7.5 0 1 1-2.2-5.3M19.5 4.5v5h-5',
		crop: 'M6.5 2.5v13a2 2 0 0 0 2 2h13M17.5 21.5v-13a2 2 0 0 0-2-2h-13',
		pencil: 'M4.5 19.5l3.8-.9L19 7.9l-2.9-2.9L5.4 15.7l-.9 3.8z',
		close: 'M6 6l12 12M18 6 6 18',
		back: 'M15 5.5 8.5 12 15 18.5',
		upload: 'M12 16.5V5M7.5 9.5 12 5l4.5 4.5M5 20h14',
		check: 'M5 12.5l4.5 4.5L19 7.5',
		alert: 'M12 3.5 21 20H3L12 3.5zM12 10v4.5M12 17.2v.1',
		play: 'M8 5.5v13l10.5-6.5L8 5.5z',
		plus: 'M12 5v14M5 12h14',
		user: 'M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM4.5 20.5a7.5 7.5 0 0 1 15 0',
		grid: 'M4 4h6v6H4zM14 4h6v6h-6zM4 14h6v6H4zM14 14h6v6h-6z',
		film: 'M4 5h16v14H4zM4 9h16M4 15h16M8 5v14M16 5v14',
		send: 'M4 12 20 4l-4 16-4.5-6.5L4 12z',
		qr: 'M4 4h6v6H4zM14 4h6v6h-6zM4 14h6v6H4zM14 14h2v2h-2zM18 14h2v2h-2zM14 18h2v2h-2zM18 18h2v2h-2z',
		zip: 'M5 3.5h9l5 5v12H5zM14 3.5v5h5M10 8v2M10 12v2M10 16v2',
		info: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM12 11v5.5M12 7.8v.1',
		rings: 'M9 18a5 5 0 1 0 0-10 5 5 0 0 0 0 10zM15 18a5 5 0 1 0 0-10 5 5 0 0 0 0 10z'
	};
</script>

<svg
	width={size}
	height={size}
	viewBox="0 0 24 24"
	fill={filled ? 'currentColor' : 'none'}
	stroke="currentColor"
	stroke-width="1.75"
	stroke-linecap="round"
	stroke-linejoin="round"
	aria-hidden={label ? undefined : 'true'}
	role={label ? 'img' : undefined}
	aria-label={label}
>
	<path d={paths[name]} />
</svg>
