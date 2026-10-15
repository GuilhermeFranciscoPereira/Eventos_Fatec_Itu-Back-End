import { createReadStream } from 'fs';
import { Readable } from 'stream';
import * as streamifier from 'streamifier';
import { prepareImageForUpload } from './image-optimizer';
import { BadGatewayException, Inject, Injectable, Logger } from '@nestjs/common';
import { v2 as cloudinary, UploadApiErrorResponse, UploadApiResponse } from 'cloudinary';

type CloudinaryResponse = UploadApiErrorResponse | UploadApiResponse;

@Injectable()
export class CloudinaryService {
  private readonly logger = new Logger(CloudinaryService.name);

  constructor(@Inject('CLOUDINARY') private readonly _: typeof cloudinary) { }

  // Accepts files kept on disk (upload interceptor) or in memory, and makes really heavy images lighter before sending.
  async uploadFile(file: Express.Multer.File): Promise<CloudinaryResponse> {
    const image = await prepareImageForUpload(file);
    try {
      const stream = image.path ? createReadStream(image.path) : streamifier.createReadStream(image.buffer as Buffer);
      return await this.send(stream);
    } finally {
      await image.cleanup();
    }
  }

  private send(source: Readable): Promise<CloudinaryResponse> {
    return new Promise((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        { folder: 'app_uploads' },
        (error, result) => {
          if (error || !result) {
            this.logger.error(`Cloudinary upload failed: ${error?.message ?? 'no result returned'}`);
            return reject(new BadGatewayException('Não foi possível salvar a imagem. Tente novamente ou envie outra imagem.'));
          }
          resolve(result);
        },
      );
      source.on('error', (err) => {
        this.logger.error(`Could not read the uploaded file: ${err.message}`);
        reject(new BadGatewayException('Não foi possível ler a imagem enviada. Tente novamente.'));
      });
      source.pipe(uploadStream);
    });
  }

  deleteFile(publicId: string): Promise<void> {
    return new Promise((resolve, reject) => {
      cloudinary.uploader.destroy(publicId, (error) => {
        if (error) return reject(error);
        resolve();
      });
    });
  }
}
