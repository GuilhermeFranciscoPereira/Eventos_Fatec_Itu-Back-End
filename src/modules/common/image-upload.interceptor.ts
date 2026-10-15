import * as multer from 'multer';
import { tmpdir } from 'os';
import { randomUUID } from 'crypto';
import { open, unlink } from 'fs/promises';
import { Request, Response } from 'express';
import { finalize, Observable } from 'rxjs';
import { BadRequestException, CallHandler, ExecutionContext, HttpException, Injectable, Logger, mixin, NestInterceptor, Type } from '@nestjs/common';

export const INVALID_IMAGE_MESSAGE = 'Envie uma imagem nos formatos JPG, PNG, WEBP, GIF ou AVIF.';

const ACCEPTED_MIME_TYPES = new Set(['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif', 'image/avif']);

// There is no size limit, so the file goes to the temp folder instead of memory: a large upload never sits whole in the API's RAM.
const storage = multer.diskStorage({
  destination: tmpdir(),
  filename: (_req, _file, callback) => callback(null, `upload-${randomUUID()}`),
});

const logger = new Logger('ImageUpload');

// The browser decides the mimetype, so the first bytes of the file are checked too: a renamed PDF or script is refused.
export function detectImageType(header: Buffer): string | null {
  const ascii = (start: number, end: number): string => header.subarray(start, end).toString('latin1');

  if (header.length >= 3 && header[0] === 0xff && header[1] === 0xd8 && header[2] === 0xff) return 'image/jpeg';
  if (header.length >= 8 && header.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return 'image/png';
  if (ascii(0, 6) === 'GIF87a' || ascii(0, 6) === 'GIF89a') return 'image/gif';
  if (ascii(0, 4) === 'RIFF' && ascii(8, 12) === 'WEBP') return 'image/webp';
  if (ascii(4, 8) === 'ftyp' && /avi[fs]/.test(ascii(8, 32))) return 'image/avif';
  return null;
}

async function readHeader(path: string): Promise<Buffer> {
  const handle = await open(path, 'r');
  try {
    const buffer = Buffer.alloc(32);
    const { bytesRead } = await handle.read(buffer, 0, buffer.length, 0);
    return buffer.subarray(0, bytesRead);
  } finally {
    await handle.close();
  }
}

export async function removeTempFile(path?: string): Promise<void> {
  if (!path) return;
  try {
    await unlink(path);
  } catch (err: unknown) {
    if ((err as NodeJS.ErrnoException).code !== 'ENOENT') logger.warn(`Could not remove temp file ${path}`);
  }
}

function toHttpError(err: unknown, fieldName: string): HttpException {
  if (err instanceof HttpException) return err;
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_UNEXPECTED_FILE' || err.code === 'LIMIT_FILE_COUNT') {
      return new BadRequestException(`Envie apenas uma imagem no campo "${fieldName}".`);
    }
    return new BadRequestException('O formulário enviado tem campos demais ou inválidos.');
  }
  return new BadRequestException('Não foi possível receber o arquivo. Tente novamente.');
}

// Replaces FileInterceptor for image fields: disk storage, image-only and the temp file is always removed when the request ends.
export function ImageUploadInterceptor(fieldName: string): Type<NestInterceptor> {
  @Injectable()
  class ImageUploadMixinInterceptor implements NestInterceptor {
    private readonly upload = multer({
      storage,
      limits: { files: 1, fields: 100, parts: 120 },
      fileFilter: (_req, file, callback) => {
        if (ACCEPTED_MIME_TYPES.has(file.mimetype.toLowerCase())) return callback(null, true);
        callback(new BadRequestException(INVALID_IMAGE_MESSAGE));
      },
    }).single(fieldName);

    async intercept(context: ExecutionContext, next: CallHandler): Promise<Observable<unknown>> {
      const http = context.switchToHttp();
      const req = http.getRequest<Request>();
      const res = http.getResponse<Response>();

      await new Promise<void>((resolve, reject) => {
        this.upload(req, res, (err: unknown) => (err ? reject(toHttpError(err, fieldName)) : resolve()));
      });

      const file = req.file;
      if (file?.path) {
        const detected = detectImageType(await readHeader(file.path));
        if (!detected) {
          await removeTempFile(file.path);
          throw new BadRequestException(INVALID_IMAGE_MESSAGE);
        }
        file.mimetype = detected;
      }

      return next.handle().pipe(finalize(() => void removeTempFile(file?.path)));
    }
  }

  return mixin(ImageUploadMixinInterceptor);
}
