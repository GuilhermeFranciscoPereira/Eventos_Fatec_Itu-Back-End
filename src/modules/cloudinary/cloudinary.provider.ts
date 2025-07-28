import { v2 as cloudinary } from 'cloudinary';
import { ConfigService } from '@nestjs/config';

export const CloudinaryProvider = {
    provide: 'CLOUDINARY',
    useFactory: (config: ConfigService) => {
        const name = config.get<string>('CLOUDINARY_NAME');
        const key = config.get<string>('CLOUDINARY_API_KEY');
        const secret = config.get<string>('CLOUDINARY_API_SECRET');

        if (!name || !key || !secret) {
            throw new Error(
                'Cloudinary config missing: verifique CLOUDINARY_NAME, CLOUDINARY_API_KEY e CLOUDINARY_API_SECRET'
            );
        }

        return cloudinary.config({ cloud_name: name, api_key: key, api_secret: secret });
    },
    inject: [ConfigService],
};
