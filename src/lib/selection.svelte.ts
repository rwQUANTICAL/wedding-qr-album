import { SvelteSet } from 'svelte/reactivity';

class Selection {
	active = $state(false);
	ids = new SvelteSet<string>();
	count = $derived(this.ids.size);

	start(): void {
		this.active = true;
	}

	stop(): void {
		this.active = false;
		this.ids.clear();
	}

	toggle(id: string): void {
		if (this.ids.has(id)) this.ids.delete(id);
		else this.ids.add(id);
	}

	has(id: string): boolean {
		return this.ids.has(id);
	}
}

export const selection = new Selection();
