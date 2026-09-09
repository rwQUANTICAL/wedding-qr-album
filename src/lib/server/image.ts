import sharp, { type Sharp } from 'sharp';
import exifReader from 'exif-reader';
import fsp from 'node:fs/promises';
import fs from 'node:fs';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import type { Crop } from './db';
import { variantPath } from './storage';

const execFileAsync = promisify(execFile);
const run = (cmd: string, args: string[]) => execFileAsync(cmd, args, { timeout: 5 * 60 * 1000 });

const ORIGINAL_MAX = 3000;
const WEB_MAX = 1600;
const CARD_MAX = 900;
const THUMB_MAX = 480;

export interface PhotoResult {
	width: number;
	height: number;
	takenAt: string | null;
}

export interface PhotoEdits {
	rotation: number;
	crop: Crop | null;
}

const HEIC_EXT = new Set(['heic', 'heif', 'hif']);

export async function readable(rawFile: string, ext: string): Promise<string> {
	if (!HEIC_EXT.has(ext)) return rawFile;
	const converted = rawFile.replace(/\.[^.]+$/, '.heic.jpg');
	await run('heif-convert', ['-q', '96', rawFile, converted]);
	return converted;
}

function readTakenAt(exif: Buffer | undefined): string | null {
	if (!exif) return null;
	try {
		const parsed = exifReader(exif);
		const date = parsed.Photo?.DateTimeOriginal ?? parsed.Image?.DateTime;
		return date instanceof Date && !isNaN(date.getTime()) ? date.toISOString() : null;
	} catch {
		return null;
	}
}

function applyCrop(img: Sharp, crop: Crop | null, width: number, height: number): Sharp {
	if (!crop) return img;
	const left = Math.round(crop.x * width);
	const top = Math.round(crop.y * height);
	const w = Math.max(1, Math.round(crop.w * width));
	const h = Math.max(1, Math.round(crop.h * height));
	return img.extract({ left, top, width: Math.min(w, width - left), height: Math.min(h, height - top) });
}

function writeWebp(input: Buffer | string, max: number, quality: number, target: string): Promise<unknown> {
	return sharp(input)
		.resize({ width: max, height: max, fit: 'inside', withoutEnlargement: true })
		.webp({ quality })
		.toFile(target);
}

/** Erzeugt eine fehlende Variante nachträglich aus original.jpg (ältere Uploads). */
export async function ensureVariant(id: string, variant: 'card' | 'thumb' | 'web'): Promise<boolean> {
	const source = variantPath(id, 'original');
	if (!fs.existsSync(source)) return false;
	const spec = { web: [WEB_MAX, 82], card: [CARD_MAX, 80], thumb: [THUMB_MAX, 75] }[variant];
	await writeWebp(source, spec[0], spec[1], variantPath(id, variant));
	return true;
}

export async function processAvatar(rawFile: string, ext: string, target: string): Promise<void> {
	const source = await readable(rawFile, ext);
	await sharp(source, { failOn: 'none' }).rotate().resize(256, 256, { fit: 'cover', position: 'attention' }).webp({ quality: 85 }).toFile(target);
	if (source !== rawFile) await fsp.rm(source, { force: true });
}

export async function processPhoto(id: string, rawFile: string, ext: string, edits: PhotoEdits): Promise<PhotoResult> {
	const source = await readable(rawFile, ext);
	const meta = await sharp(source).metadata();
	const takenAt = readTakenAt(meta.exif);

	const oriented = sharp(source, { failOn: 'none' }).rotate().rotate(edits.rotation);
	const orientedMeta = await oriented.toBuffer({ resolveWithObject: true });
	const base = applyCrop(sharp(orientedMeta.data), edits.crop, orientedMeta.info.width, orientedMeta.info.height);
	const baseBuffer = await base.toBuffer();

	const original = await sharp(baseBuffer)
		.resize({ width: ORIGINAL_MAX, height: ORIGINAL_MAX, fit: 'inside', withoutEnlargement: true })
		.jpeg({ quality: 88, mozjpeg: true, chromaSubsampling: '4:4:4' })
		.toFile(variantPath(id, 'original'));

	await Promise.all([
		writeWebp(baseBuffer, WEB_MAX, 82, variantPath(id, 'web')),
		writeWebp(baseBuffer, CARD_MAX, 80, variantPath(id, 'card')),
		writeWebp(baseBuffer, THUMB_MAX, 75, variantPath(id, 'thumb'))
	]);

	if (source !== rawFile) await fsp.rm(source, { force: true });
	return { width: original.width, height: original.height, takenAt };
}
