import { CertificatesService } from './certificates.service';
import { Controller, Get, Param, NotFoundException } from '@nestjs/common';
import { ApiNotFoundResponse, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';

@Controller('certificates')
@ApiTags('Certificates')
export class CertificatesController {
    constructor(private service: CertificatesService) { }

    @Get('verify/:token')
    @ApiOperation({ summary: 'Valida certificado', description: 'Rota pública para verificar autenticidade de um certificado pelo token.' })
    @ApiOkResponse({ schema: { example: { participantName: 'Maria Oliveira', eventName: 'Hackathon Fatec Itu' } } })
    @ApiNotFoundResponse({ description: 'Certificado não encontrado ou token inválido.' })
    async verify(@Param('token') token: string) {
        const data = await this.service.verifyToken(token);
        if (!data) throw new NotFoundException();
        return data;
    }
}
