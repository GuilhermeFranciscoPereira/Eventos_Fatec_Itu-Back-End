import * as csurf from 'csurf';
import * as request from 'supertest';
import { Role } from '@prisma/client';
import * as cookieParser from 'cookie-parser';
import { AppModule } from '../src/app.module';
import { Test, TestingModule } from '@nestjs/testing';
import { EmailService } from '../src/services/email.service';
import { INestApplication, ValidationPipe, HttpStatus } from '@nestjs/common';
import { PrismaService } from '../src/modules/prisma/prisma.service';
import * as argon2 from 'argon2';

describe('E2E Tests', () => {
    let app: INestApplication;
    let capturedHtml = '';
    const mockData: {
        users: Array<{ id: number; name: string; email: string; password: string; role: Role }>;
        refreshTokens: Array<any>;
    } = { users: [], refreshTokens: [] };
    const prismaMock: Partial<PrismaService> = {
        user: {
            findUnique: jest.fn(async ({ where }: any) => {
                if (where.email) return mockData.users.find(u => u.email === where.email) || null;
                if (where.id) return mockData.users.find(u => u.id === where.id) || null;
                return null;
            }),
            findMany: jest.fn(async () => [...mockData.users]),
            create: jest.fn(async ({ data }: any) => {
                const id = mockData.users.length + 1;
                const u = { id, ...data };
                mockData.users.push(u);
                return u;
            }),
            update: jest.fn(async ({ where, data }: any) => {
                const u = mockData.users.find(x => x.id === where.id)!;
                Object.assign(u, data);
                return u;
            }),
            delete: jest.fn(async ({ where }: any) => {
                const idx = mockData.users.findIndex(x => x.id === where.id);
                return mockData.users.splice(idx, 1)[0];
            }),
        },
        refreshToken: {
            deleteMany: jest.fn<Promise<{ count: number }>, []>(async () => ({ count: 0 })),
            updateMany: jest.fn<Promise<{ count: number }>, []>(async () => ({ count: 0 })),
            create: jest.fn<Promise<any>, [{ data: any }]>(async ({ data }) => {
                const id = mockData.refreshTokens.length + 1;
                const rt = { id, ...data };
                mockData.refreshTokens.push(rt);
                return rt;
            }),
            findFirst: jest.fn<Promise<any | null>, []>(async () => mockData.refreshTokens[0] || null),
        },
        $transaction: jest.fn<Promise<any[]>, [any[]]>(async actions => {
            const out: any[] = [];
            for (const a of actions) {
                out.push(await a);
            }
            return out;
        }),

    } as any;

    beforeAll(async () => {
        const pepper = 'PEPPER';
        const hash = await argon2.hash('Admin123!' + pepper, { type: argon2.argon2id });
        mockData.users.push({ id: 1, name: 'Admin', email: 'admin@fatec.sp.gov.br', password: hash, role: Role.ADMIN });
        const module: TestingModule = await Test.createTestingModule({
            imports: [AppModule],
        })
            .overrideProvider(EmailService)
            .useValue({ send: async (_to, _sub, html: string) => { capturedHtml = html; } })
            .overrideProvider(PrismaService)
            .useValue(prismaMock)
            .compile();
        app = module.createNestApplication();
        app.use(cookieParser());
        app.use(csurf({ cookie: { httpOnly: true, secure: false } }));
        app.useGlobalPipes(new ValidationPipe({ whitelist: true }));
        await app.init();
    });

    afterAll(async () => { await app.close(); });

    async function getCsrf() {
        const res = await request(app.getHttpServer()).get('/csrf-token').expect(HttpStatus.OK);
        const cookie = (res.headers['set-cookie'] as unknown as string[]).map(c => c.split(';')[0]).join('; ');
        return { token: res.body.csrfToken, cookie };
    }

    describe('Auth flows', () => {
        it('should fail login with wrong password', async () => {
            const { token, cookie } = await getCsrf();
            await request(app.getHttpServer())
                .post('/auth/request-login')
                .set('cookie', cookie)
                .set('X-CSRF-Token', token)
                .send({ email: 'admin@fatec.sp.gov.br', password: 'Wrong1!' })
                .expect(HttpStatus.UNAUTHORIZED);
        });

        it('should login with 2FA and then logout', async () => {
            const { token, cookie } = await getCsrf();
            const req = await request(app.getHttpServer())
                .post('/auth/request-login')
                .set('cookie', cookie)
                .set('X-CSRF-Token', token)
                .send({ email: 'admin@fatec.sp.gov.br', password: 'Admin123!' })
                .expect(HttpStatus.OK);
            const twoFaCookie = (req.headers['set-cookie'] as unknown as string[]).map(c => c.split(';')[0]).join('; ');
            const code = capturedHtml.match(/>(\d{6})</)![1];
            const { token: t2, cookie: c2 } = await getCsrf();
            const login = await request(app.getHttpServer())
                .post('/auth/login')
                .set('cookie', [twoFaCookie, c2].join('; '))
                .set('X-CSRF-Token', t2)
                .send({ code })
                .expect(HttpStatus.OK);
            const authCookie = (login.headers['set-cookie'] as unknown as string[]).map(c => c.split(';')[0]).join('; ');
            const { token: t3, cookie: c3 } = await getCsrf();
            await request(app.getHttpServer())
                .get('/auth/me')
                .set('cookie', [authCookie, c3].join('; '))
                .set('X-CSRF-Token', t3)
                .expect(HttpStatus.OK);
            const { token: t4, cookie: c4 } = await getCsrf();
            await request(app.getHttpServer())
                .post('/auth/logout')
                .set('cookie', [authCookie, c4].join('; '))
                .set('X-CSRF-Token', t4)
                .expect(HttpStatus.OK, { message: 'Logged out successfully!' });
        });

        it('should fail reset password for non-existing email', async () => {
            const { token, cookie } = await getCsrf();
            await request(app.getHttpServer())
                .post('/auth/request-reset-password')
                .set('cookie', cookie)
                .set('X-CSRF-Token', token)
                .send({ email: 'no@exist.sp.gov.br' })
                .expect(HttpStatus.UNAUTHORIZED);
        });

        it('should reset password flow', async () => {
            const { token, cookie } = await getCsrf();
            const rr = await request(app.getHttpServer())
                .post('/auth/request-reset-password')
                .set('cookie', cookie)
                .set('X-CSRF-Token', token)
                .send({ email: 'admin@fatec.sp.gov.br' })
                .expect(HttpStatus.OK);
            const resetCookie = (rr.headers['set-cookie'] as unknown as string[]).map(c => c.split(';')[0]).join('; ');
            const code = capturedHtml.match(/>(\d{6})</)![1];
            const { token: t2, cookie: c2 } = await getCsrf();
            await request(app.getHttpServer())
                .post('/auth/reset-password')
                .set('cookie', [resetCookie, c2].join('; '))
                .set('X-CSRF-Token', t2)
                .send({ code, newPassword: 'NewPass1!' })
                .expect(HttpStatus.OK, { message: 'Password reset successful' });
        });
    });

    describe('Users flows', () => {
        it('should forbid GET /users without token', async () => {
            const { token, cookie } = await getCsrf();
            await request(app.getHttpServer())
                .get('/users')
                .set('cookie', cookie)
                .set('X-CSRF-Token', token)
                .expect(HttpStatus.UNAUTHORIZED);
        });

        let authCookie: string;
        beforeAll(async () => {
            const { token, cookie } = await getCsrf();
            const rl = await request(app.getHttpServer())
                .post('/auth/request-login')
                .set('cookie', cookie)
                .set('X-CSRF-Token', token)
                .send({ email: 'admin@fatec.sp.gov.br', password: 'Admin123!' });
            const twoFaCookie = (rl.headers['set-cookie'] as unknown as string[]).map(c => c.split(';')[0]).join('; ');
            const code = capturedHtml.match(/>(\d{6})</)![1];
            const { token: t2, cookie: c2 } = await getCsrf();
            const login = await request(app.getHttpServer())
                .post('/auth/login')
                .set('cookie', [twoFaCookie, c2].join('; '))
                .set('X-CSRF-Token', t2)
                .send({ code });
            authCookie = (login.headers['set-cookie'] as unknown as string[]).map(c => c.split(';')[0]).join('; ');
        });

        it('should create, list, update and delete user', async () => {
            const { token, cookie } = await getCsrf();
            const create = await request(app.getHttpServer())
                .post('/users/register')
                .set('cookie', [authCookie, cookie].join('; '))
                .set('X-CSRF-Token', token)
                .send({ name: 'User1', email: 'u1@fatec.sp.gov.br', password: 'User123!', role: Role.AUXILIAR })
                .expect(HttpStatus.CREATED);
            expect(create.body).toHaveProperty('id');
            const uid = create.body.id;
            const list = await request(app.getHttpServer())
                .get('/users')
                .set('cookie', [authCookie, cookie].join('; '))
                .set('X-CSRF-Token', token)
                .expect(HttpStatus.OK);
            expect(list.body.some((u: any) => u.id === uid)).toBe(true);
            await request(app.getHttpServer())
                .patch(`/users/patch/${uid}`)
                .set('cookie', [authCookie, cookie].join('; '))
                .set('X-CSRF-Token', token)
                .send({ name: 'User1Updated' })
                .expect(HttpStatus.OK)
                .then(res => expect(res.body.name).toBe('User1Updated'));
            await request(app.getHttpServer())
                .delete(`/users/delete/${uid}`)
                .set('cookie', [authCookie, cookie].join('; '))
                .set('X-CSRF-Token', token)
                .expect(HttpStatus.OK, { message: 'User deleted successfully.' });
        });
    });
});
