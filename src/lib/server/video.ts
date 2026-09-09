import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import sharp from 'sharp';
import { LIMITS } from './env';
import { variantPath } from './storage';

const execFileAsync = promisify(execFile);
const TIMEOUT_MS = 10 * 60 * 1000;

function run(cmd: string, args: string[], opts: { maxBuffer?: number } = {}): Promise<{ stdout: string; stderr: string }> {
	return execFileAsync(cmd, args, { timeout: TIMEOUT_MS, encoding: 'utf8', ...opts });
}

export interface VideoResult {
	width: number;
	height: number;
	duration: number;
	takenAt: string | null;
}

interface Probe {
	width: number;
	height: number;
	duration: number;
	rotation: number;
	creationTime: string | null;
}

async function probe(file: string): Promise<Probe> {
	const { stdout } = await run('ffprobe', [
		'-v', 'error',
		'-print_format', 'json',
		'-show_format',
		'-show_streams',
		file
	]);
	const data = JSON.parse(stdout);
	const video = data.streams.find((s: { codec_type: string }) => s.codec_type === 'video');
	if (!video) throw new Error('No video track found');
	const rotation = Number(video.side_data_list?.find((s: { rotation?: number }) => s.rotation != null)?.rotation ?? video.tags?.rotate ?? 0);
	return {
		width: video.width,
		height: video.height,
		duration: Number(data.format.duration ?? video.duration ?? 0),
		rotation,
		creationTime: data.format.tags?.creation_time ?? null
	};
}

export async function processVideo(id: string, rawFile: string): Promise<VideoResult> {
	const info = await probe(rawFile);
	if (info.duration > LIMITS.videoSeconds + 5) {
		throw new Error(`Video is ${Math.round(info.duration)} s long, limit is ${LIMITS.videoSeconds} s`);
	}

	await run('ffmpeg', [
		'-y', '-i', rawFile,
		'-t', String(LIMITS.videoSeconds),
		'-vf', "scale='min(1920,iw)':'min(1080,ih)':force_original_aspect_ratio=decrease:force_divisible_by=2",
		'-c:v', 'libx264', '-preset', 'medium', '-crf', '23', '-pix_fmt', 'yuv420p',
		'-c:a', 'aac', '-b:a', '128k', '-ac', '2',
		'-movflags', '+faststart',
		variantPath(id, 'video')
	], { maxBuffer: 10 * 1024 * 1024 });

	const posterJpg = variantPath(id, 'poster').replace(/\.webp$/, '.jpg');
	await run('ffmpeg', ['-y', '-ss', '1', '-i', variantPath(id, 'video'), '-frames:v', '1', '-q:v', '2', posterJpg]);
	await Promise.all([
		sharp(posterJpg).webp({ quality: 82 }).toFile(variantPath(id, 'poster')),
		sharp(posterJpg).resize({ width: 900, height: 900, fit: 'inside' }).webp({ quality: 80 }).toFile(variantPath(id, 'card')),
		sharp(posterJpg).resize({ width: 480, height: 480, fit: 'inside' }).webp({ quality: 75 }).toFile(variantPath(id, 'thumb'))
	]);
	await run('rm', ['-f', posterJpg]);

	const out = await probe(variantPath(id, 'video'));
	const swapped = Math.abs(info.rotation) === 90 || Math.abs(info.rotation) === 270;
	return {
		width: swapped ? out.height : out.width,
		height: swapped ? out.width : out.height,
		duration: Math.min(out.duration, LIMITS.videoSeconds),
		takenAt: info.creationTime
	};
}
