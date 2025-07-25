import * as csurf from 'csurf';
import * as request from 'supertest';
import { Role } from '@prisma/client';
import * as cookieParser from 'cookie-parser';
import { AppModule } from '../src/app.module';
import { Test, TestingModule } from '@nestjs/testing';
import { EmailService } from '../src/services/email.service';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { PrismaService } from '../src/modules/prisma/prisma.service';

describe('AuthModule (e2e) – com mock de dados', () => {
    let app: INestApplication;
    let capturedHtml: string;

    const mockData: {
        users: Array<{ id: number; name: string; email: string; password: string; role: Role }>;
        refreshTokens: Array<{
            id: number;
            userId: number;
            tokenHash: string;
            isRevoked: boolean;
            expiresAt: Date;
        }>;
    } = {
        users: [],
        refreshTokens: [],
    };

    const mockPrismaService: Partial<PrismaService> = {
        user: {
            findUnique: jest.fn(async ({ where }: any) => {
                if (where.email) {
                    return (
                        mockData.users.find((u) => u.email === where.email) || null
                    );
                }
                if (where.id) {
                    return (
                        mockData.users.find((u) => u.id === where.id) || null
                    );
                }
                return null;
            }),
            create: jest.fn(async ({ data }: any) => {
                const id = mockData.users.length + 1;
                const newUser = {
                    id,
                    name: data.name,
                    email: data.email,
                    password: data.password,
                    role: data.role,
                };
                mockData.users.push(newUser);
                return newUser;
            }),
            update: jest.fn(async ({ where, data }: any) => {
                const user = mockData.users.find((u) => u.id === where.id)!;
                Object.assign(user, data);
                return user;
            }),
        },
        refreshToken: {
            deleteMany: jest.fn(async () => {
                mockData.refreshTokens.length = 0;
                return { count: 0 };
            }),
            updateMany: jest.fn(async ({ where, data }: any) => {
                mockData.refreshTokens.forEach((rt) => {
                    if (rt.userId === where.userId && !rt.isRevoked) {
                        Object.assign(rt, data);
                    }
                });
                return { count: mockData.refreshTokens.length };
            }),
            create: jest.fn(async ({ data }: any) => {
                const id = mockData.refreshTokens.length + 1;
                const newRT = { id, ...data };
                mockData.refreshTokens.push(newRT);
                return newRT;
            }),
            findFirst: jest.fn(async ({ where }: any) => {
                const now = new Date();
                return (
                    mockData.refreshTokens.find(
                        (rt) =>
                            rt.userId === where.userId &&
                            rt.tokenHash === where.tokenHash &&
                            !rt.isRevoked &&
                            rt.expiresAt > now
                    ) || null
                );
            }),
        },
        $transaction: jest.fn(async (actions: []) => {
            const results = [];
            for (const act of actions) {
                results.push(await act);
            }
            return results;
        }),
    } as unknown as PrismaService;

    beforeAll(async () => {
        const moduleFixture: TestingModule = await Test.createTestingModule({
            imports: [AppModule],
        })
            .overrideProvider(EmailService)
            .useValue({
                send: async (_to: string, _subject: string, html: string) => {
                    capturedHtml = html;
                },
            })
            .overrideProvider(PrismaService)
            .useValue(mockPrismaService)
            .compile();

        app = moduleFixture.createNestApplication();
        app.use(cookieParser());
        app.use(csurf({ cookie: { httpOnly: true, secure: false } }));
        app.useGlobalPipes(new ValidationPipe({ whitelist: true }));
        await app.init();
    });

    afterAll(async () => {
        await app.close();
    });

    async function getCsrf(): Promise<{ csrfToken: string; cookie: string }> {
        const res = await request(app.getHttpServer()).get('/csrf-token').expect(200);
        const setCookies = res.headers['set-cookie'] as unknown as string[];
        const csrfCookie = setCookies.map((c) => c.split(';')[0]).join('; ');
        return { csrfToken: res.body.csrfToken, cookie: csrfCookie };
    }

    const user = {
        email: 'e2e_test@fatec.sp.gov.br',
        password: 'P@ssw0rd!',
        role: Role.ADMIN,
        name: 'E2E Test',
    };

    it('deve registrar, logar com 2FA, acessar rota protegida e deslogar', async () => {
        const { csrfToken, cookie: csrfCookie } = await getCsrf();

        const registerRes = await request(app.getHttpServer())
            .post('/auth/register')
            .set('cookie', csrfCookie)
            .set('X-CSRF-Token', csrfToken)
            .send(user)
            .expect(201);
        expect(registerRes.body).toHaveProperty('id');
        expect(registerRes.body.email).toBe(user.email);

        const reqLoginRes = await request(app.getHttpServer())
            .post('/auth/request-login')
            .set('cookie', csrfCookie)
            .set('X-CSRF-Token', csrfToken)
            .send({ email: user.email, password: user.password })
            .expect(200);
        expect(reqLoginRes.body).toEqual({ requires2FA: true });
        const twoFaTokenCookie = (reqLoginRes.headers['set-cookie'] as unknown as string[])
            .map((c) => c.split(';')[0])
            .join('; ');

        const codeMatch = capturedHtml.match(/>(\d{6})</);
        expect(codeMatch).not.toBeNull();
        const twoFaCode = codeMatch![1];

        const { csrfToken: csrfToken2, cookie: csrfCookie2 } = await getCsrf();
        const loginCookies = [twoFaTokenCookie, csrfCookie2].join('; ');
        const loginRes = await request(app.getHttpServer())
            .post('/auth/login')
            .set('cookie', loginCookies)
            .set('X-CSRF-Token', csrfToken2)
            .send({ code: twoFaCode })
            .expect(200);
        expect(loginRes.body).toEqual({ message: 'Autenticado com 2FA' });
        const authCookies = (loginRes.headers['set-cookie'] as unknown as string[])
            .map((c) => c.split(';')[0])
            .join('; ');

        const { csrfToken: csrfToken3, cookie: csrfCookie3 } = await getCsrf();
        const combinedCookies = [authCookies, csrfCookie3].join('; ');
        const meRes = await request(app.getHttpServer())
            .get('/auth/me')
            .set('cookie', combinedCookies)
            .set('X-CSRF-Token', csrfToken3)
            .expect(200);
        expect(meRes.body).toHaveProperty('sub', registerRes.body.id);
        expect(meRes.body).toHaveProperty('email', user.email);

        const { csrfToken: csrfToken4, cookie: csrfCookie4 } = await getCsrf();
        const logoutCookies = [authCookies, csrfCookie4].join('; ');
        const logoutRes = await request(app.getHttpServer())
            .post('/auth/logout')
            .set('cookie', logoutCookies)
            .set('X-CSRF-Token', csrfToken4)
            .expect(200);
        expect(logoutRes.body).toEqual({ message: 'Deslogado com sucesso!' });
    });

    it('deve solicitar reset de senha e completar o fluxo', async () => {
        const { csrfToken, cookie: csrfCookie } = await getCsrf();

        const reqResetRes = await request(app.getHttpServer())
            .post('/auth/request-reset-password')
            .set('cookie', csrfCookie)
            .set('X-CSRF-Token', csrfToken)
            .send({ email: user.email })
            .expect(200);
        expect(reqResetRes.body).toEqual({ message: 'O código foi enviado por e-mail' });
        const resetTokenCookie = (reqResetRes.headers['set-cookie'] as unknown as string[])
            .map((c) => c.split(';')[0])
            .join('; ');

        const codeMatch = capturedHtml.match(/>(\d{6})</);
        expect(codeMatch).not.toBeNull();
        const resetCode = codeMatch![1];

        const { csrfToken: csrfToken2, cookie: csrfCookie2 } = await getCsrf();
        const resetCookies = [resetTokenCookie, csrfCookie2].join('; ');
        const newPassword = 'N3wP@ss!';
        const resetRes = await request(app.getHttpServer())
            .post('/auth/reset-password')
            .set('cookie', resetCookies)
            .set('X-CSRF-Token', csrfToken2)
            .send({ code: resetCode, newPassword })
            .expect(200);
        expect(resetRes.body).toEqual({ message: 'Senha redefinida com sucesso' });
    });
});
