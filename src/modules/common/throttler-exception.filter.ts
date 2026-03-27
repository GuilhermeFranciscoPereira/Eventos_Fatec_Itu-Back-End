import { Request, Response } from 'express'
import { ThrottlerException } from '@nestjs/throttler'
import { Catch, ExceptionFilter, ArgumentsHost, HttpStatus } from '@nestjs/common'

@Catch(ThrottlerException)
export class ThrottlerExceptionFilter implements ExceptionFilter {
    catch(_: ThrottlerException, host: ArgumentsHost) {
        const ctx = host.switchToHttp()
        const response = ctx.getResponse<Response>()
        const request = ctx.getRequest<Request>()

        const retryAfter = 60

        response.status(HttpStatus.TOO_MANY_REQUESTS).json({
            statusCode: 429,
            message: `Muitas tentativas. Tente novamente em ${retryAfter} segundos.`,
            error: 'Too Many Requests',
            path: request.url,
            timestamp: new Date().toISOString()
        })
    }
}