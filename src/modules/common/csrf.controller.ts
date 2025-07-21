import { Controller, Get, Req } from '@nestjs/common';

@Controller()
export class CsrfController {
    @Get('csrf-token')
    getCsrf(@Req() req) {
        return { csrfToken: req.csrfToken() };
    }
}
