import { PrismaClient } from '@prisma/client';
import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
    private readonly logger = new Logger(PrismaService.name);

    //IF WANT SEE LOGGER ABOUT THE PRISMA!
    // constructor() {
    //     super({
    //         log: [
    //             { level: 'query', emit: 'event' },
    //             { level: 'info', emit: 'event' },
    //             { level: 'warn', emit: 'event' },
    //             { level: 'error', emit: 'event' },
    //         ],
    //     });

    //     (this as any).$on('query', (e: { query: string; params: string; duration: number }) => {
    //         this.logger.debug(
    //             `Query Executada ➜ ${e.query} | Params: ${e.params} | Duração: ${e.duration}ms`,
    //         );
    //     });

    //     (this as any).$on('info', (e: { message: string }) => this.logger.log(e.message));
    //     (this as any).$on('warn', (e: { message: string }) => this.logger.warn(e.message));
    //     (this as any).$on('error', (e: { message: string }) => this.logger.error(e.message));
    // }

    async onModuleInit() {
        await this.$connect();
        this.logger.log('Connected Prisma to the database');
    }

    async onModuleDestroy() {
        await this.$disconnect();
        this.logger.log('Disconnected Prisma from the database');
    }

}
