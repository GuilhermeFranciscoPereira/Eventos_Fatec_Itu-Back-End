import { CertificatesService } from './certificates.service';
import { Controller, Get, Param, NotFoundException } from '@nestjs/common';

@Controller('certificates')
export class CertificatesController {
    constructor(private service: CertificatesService) { }

    @Get('verify/:token')
    async verify(@Param('token') token: string) {
        const data = await this.service.verifyToken(token);
        if (!data) throw new NotFoundException();
        return data;
    }
}
