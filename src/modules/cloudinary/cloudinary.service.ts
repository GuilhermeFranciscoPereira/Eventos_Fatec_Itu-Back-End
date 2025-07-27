import streamifier from 'streamifier';
import { Inject, Injectable } from '@nestjs/common';
import { v2 as cloudinary, UploadApiErrorResponse, UploadApiResponse } from 'cloudinary';

type CloudinaryResponse = UploadApiErrorResponse | UploadApiResponse;

@Injectable()
export class CloudinaryService {
  constructor(@Inject('CLOUDINARY') private readonly _: typeof cloudinary) { }

  uploadFile(file: Express.Multer.File): Promise<CloudinaryResponse> {
    return new Promise((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        { folder: 'app_uploads' },
        (error, result) => {
          if (error) return reject(error);
          if (!result) return reject(new Error('No result returned from Cloudinary'));
          resolve(result);
        },
      );
      streamifier.createReadStream(file.buffer).pipe(uploadStream);
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
