import * as sharpModule from 'sharp';
import { stat } from 'fs/promises';
import { Logger } from '@nestjs/common';
import { AuditContext } from '../audit/audit.context';
import { removeTempFile } from '../common/image-upload.interceptor';

// The typings describe an ES module default export, but in CommonJS require('sharp') returns the function itself.
const sharp = ((sharpModule as unknown as { default?: typeof sharpModule.default }).default ?? sharpModule) as unknown as typeof sharpModule.default;
// Each upload is processed once: the libvips cache would only hold memory and keep temp files open (locked on Windows).
sharp.cache(false);

// Only really heavy files are re-encoded: everyday photos keep their original quality.
export const HEAVY_IMAGE_BYTES = 5 * 1024 * 1024;
// Wide enough for a full-width banner on large screens.
export const MAX_IMAGE_DIMENSION = 2560;
const WEBP_QUALITY = 82;

export type PreparedImage = {
  path?: string;
  buffer?: Buffer;
  size: number;
  optimized: boolean;
  cleanup: () => Promise<void>;
};

const logger = new Logger('ImageOptimizer');
const noop = async (): Promise<void> => undefined;

function formatMegabytes(bytes: number): string {
  return `${(bytes / 1024 / 1024).toFixed(2)} MB`;
}

// Resizes to at most 2560px and converts to WebP when the file passes 5 MB. If the result is not smaller,
// or the image cannot be processed, the original file is sent as it is.
export async function prepareImageForUpload(file: Express.Multer.File): Promise<PreparedImage> {
  const original: PreparedImage = { path: file.path, buffer: file.buffer, size: file.size, optimized: false, cleanup: noop };
  if (file.size <= HEAVY_IMAGE_BYTES) return original;

  const source = file.path ?? file.buffer;
  if (!source) return original;

  const outputPath = file.path ? `${file.path}-optimized.webp` : undefined;

  try {
    const metadata = await sharp(source).metadata();
    const isAnimated = (metadata.pages ?? 1) > 1;
    let pipeline = sharp(source, { animated: isAnimated });
    // Phone photos are often stored sideways with an EXIF flag: rotate before the flag is dropped.
    if (!isAnimated) pipeline = pipeline.rotate();
    pipeline = pipeline
      .resize({ width: MAX_IMAGE_DIMENSION, height: MAX_IMAGE_DIMENSION, fit: 'inside', withoutEnlargement: true })
      .webp({ quality: WEBP_QUALITY, effort: 4 });

    let result: PreparedImage;
    if (outputPath) {
      await pipeline.toFile(outputPath);
      const { size } = await stat(outputPath);
      result = { path: outputPath, size, optimized: true, cleanup: () => removeTempFile(outputPath) };
    } else {
      const buffer = await pipeline.toBuffer();
      result = { buffer, size: buffer.length, optimized: true, cleanup: noop };
    }

    if (result.size >= file.size) {
      await result.cleanup();
      return original;
    }

    AuditContext.addDetails({
      optimizedImage: {
        originalSize: formatMegabytes(file.size),
        finalSize: formatMegabytes(result.size),
        format: 'WEBP',
        maxDimension: `${MAX_IMAGE_DIMENSION}px`,
      },
    });
    return result;
  } catch (err: unknown) {
    await removeTempFile(outputPath);
    logger.warn(`Could not optimize a ${formatMegabytes(file.size)} image, sending the original: ${err instanceof Error ? err.message : String(err)}`);
    return original;
  }
}
