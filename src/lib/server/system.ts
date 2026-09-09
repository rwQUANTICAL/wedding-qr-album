import fs from 'node:fs/promises';
import os from 'node:os';
import { DATA_DIR } from './env';

export interface SystemStatus {
	diskUsed: number;
	diskTotal: number;
	memUsed: number;
	memTotal: number;
	load1: number;
	cpus: number;
}

async function cgroupMemory(): Promise<{ used: number; total: number } | null> {
	try {
		const [max, current] = await Promise.all([
			fs.readFile('/sys/fs/cgroup/memory.max', 'utf8'),
			fs.readFile('/sys/fs/cgroup/memory.current', 'utf8')
		]);
		if (max.trim() === 'max') return null;
		return { used: Number(current), total: Number(max) };
	} catch {
		return null;
	}
}

export async function systemStatus(): Promise<SystemStatus> {
	const stat = await fs.statfs(DATA_DIR);
	const diskTotal = stat.blocks * stat.bsize;
	const diskUsed = diskTotal - stat.bavail * stat.bsize;
	const cg = await cgroupMemory();
	return {
		diskUsed,
		diskTotal,
		memUsed: cg?.used ?? os.totalmem() - os.freemem(),
		memTotal: cg?.total ?? os.totalmem(),
		load1: os.loadavg()[0],
		cpus: os.cpus().length
	};
}
