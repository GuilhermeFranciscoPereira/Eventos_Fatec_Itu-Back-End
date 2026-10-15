import * as sharpModule from 'sharp';
import { tmpdir } from 'os';
import { join } from 'path';
import { randomBytes, randomUUID } from 'crypto';
import { existsSync } from 'fs';
import { stat, unlink, writeFile } from 'fs/promises';
import { HEAVY_IMAGE_BYTES, MAX_IMAGE_DIMENSION, prepareImageForUpload } from './image-optimizer';

const sharp = ((sharpModule as unknown as { default?: typeof sharpModule.default }).default ?? sharpModule) as unknown as typeof sharpModule.default;

// Random pixels barely compress, so a 3200x1800 PNG easily passes the 5 MB mark like a heavy camera photo.
async function writeNoisyPng(width: number, height: number): Promise<string> {
  const path = join(tmpdir(), `optimizer-test-${randomUUID()}.png`);
  const buffer = await sharp(randomBytes(width * height * 3), { raw: { width, height, channels: 3 } }).png({ compressionLevel: 0 }).toBuffer();
  await writeFile(path, buffer);
  return path;
}

function asMulterFile(path: string, size: number, mimetype = 'image/png'): Express.Multer.File {
  return { path, size, mimetype, originalname: 'foto.png', fieldname: 'image' } as Express.Multer.File;
}

describe('image optimizer - Unitary Test', () => {
  const created: string[] = [];

  afterAll(async () => {
    await Promise.all(created.map(path => unlink(path).catch(() => undefined)));
  });

  it('should keep light images untouched', async () => {
    const path = await writeNoisyPng(200, 200);
    created.push(path);
    const { size } = await stat(path);

    const result = await prepareImageForUpload(asMulterFile(path, size));

    expect(result).toMatchObject({ path, size, optimized: false });
  });

  it('should resize and convert heavy images to WebP, then clean the temp file', async () => {
    const path = await writeNoisyPng(3200, 1800);
    created.push(path);
    const { size } = await stat(path);
    expect(size).toBeGreaterThan(HEAVY_IMAGE_BYTES);

    const result = await prepareImageForUpload(asMulterFile(path, size));

    expect(result.optimized).toBe(true);
    expect(result.size).toBeLessThan(size);
    const metadata = await sharp(result.path!).metadata();
    expect(metadata.format).toBe('webp');
    expect(Math.max(metadata.width ?? 0, metadata.height ?? 0)).toBeLessThanOrEqual(MAX_IMAGE_DIMENSION);

    await result.cleanup();
    expect(existsSync(result.path!)).toBe(false);
  }, 60_000);

  it('should send the original when the file cannot be processed', async () => {
    const path = join(tmpdir(), `optimizer-test-${randomUUID()}.jpg`);
    await writeFile(path, Buffer.concat([Buffer.from([0xff, 0xd8, 0xff]), randomBytes(HEAVY_IMAGE_BYTES + 10)]));
    created.push(path);

    const result = await prepareImageForUpload(asMulterFile(path, HEAVY_IMAGE_BYTES + 13, 'image/jpeg'));

    expect(result).toMatchObject({ path, optimized: false });
  });
});
