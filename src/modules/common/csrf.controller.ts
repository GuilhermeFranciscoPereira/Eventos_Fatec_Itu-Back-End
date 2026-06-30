import { Controller, Get, Req } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';

@Controller()
@ApiTags('CSRF')
export class CsrfController {
    @Get('csrf-token')
    @ApiOperation({ summary: 'Obtém token CSRF', description: 'Rota pública usada antes de requisições POST, PATCH e DELETE.' })
    @ApiOkResponse({ schema: { example: { csrfToken: 'csrf-token-value' } } })
    getCsrf(@Req() req) {
        return { csrfToken: req.csrfToken() };
    }
}
