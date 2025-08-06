import * as csurf from 'csurf';
import * as request from 'supertest';
import * as cookieParser from 'cookie-parser';
import { AppModule } from '../src/app.module';
import { Test, TestingModule } from '@nestjs/testing';
import { RolesGuard } from '../src/guards/roles.guard';
import { JwtAuthGuard } from '../src/guards/jwt-auth.guard';
import { AuthService } from '../src/modules/auth/auth.service';
import { EventsService } from '../src/modules/events/events.service';
import { UsersService } from '../src/modules/users/users.service';
import { CarouselService } from '../src/modules/carousel/carousel.service';
import { CategoriesService } from '../src/modules/categories/categories.service';
import { ParticipantsService } from '../src/modules/participants/participants.service';
import { INestApplication, ValidationPipe, UnauthorizedException, ConflictException, NotFoundException } from '@nestjs/common';

describe('Application Tests - (e2e)', () => {
    let app: INestApplication;
    let server: any;
    let csrfCookie: string;
    let csrfToken: string;

    const authStub: any = {
        requestLogin: jest.fn(),
        login: jest.fn(),
        getMe: jest.fn(),
        refreshTokens: jest.fn(),
        logout: jest.fn(),
        requestPasswordReset: jest.fn(),
        passwordReset: jest.fn(),
        removeExpiredRefreshTokens: jest.fn(),
    };
    const usersStub: any = {
        findAll: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
    };
    const categoriesStub: any = {
        findAll: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
    };
    const carouselStub: any = {
        findAll: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        toggleActive: jest.fn(),
        delete: jest.fn(),
    };
    const eventsStub: any = {
        findAll: jest.fn(),
        findOne: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        remove: jest.fn(),
        getAvailableDates: jest.fn(),
        getAvailableTimes: jest.fn(),
    };
    const participantsStub: any = {
        create: jest.fn(),
        update: jest.fn(),
    }

    beforeAll(async () => {
        const moduleFixture: TestingModule = await Test.createTestingModule({
            imports: [AppModule],
        })
            .overrideProvider(AuthService).useValue(authStub)
            .overrideProvider(UsersService).useValue(usersStub)
            .overrideProvider(CategoriesService).useValue(categoriesStub)
            .overrideProvider(CarouselService).useValue(carouselStub)
            .overrideProvider(EventsService).useValue(eventsStub)
            .overrideProvider(ParticipantsService).useValue(participantsStub)
            .overrideGuard(JwtAuthGuard).useValue({
                canActivate: ctx => {
                    const req = ctx.switchToHttp().getRequest();
                    req.user = { userId: 1, email: 'admin@cms.sp.gov.br', role: 'ADMIN' };
                    return true;
                },
            })
            .overrideGuard(RolesGuard).useValue({ canActivate: () => true })
            .compile();

        app = moduleFixture.createNestApplication();
        app.setGlobalPrefix('apiEvents');
        app.use(cookieParser());
        app.use(csurf({ cookie: { httpOnly: true, sameSite: 'lax' } }));
        app.useGlobalPipes(
            new ValidationPipe({
                whitelist: true,
                forbidNonWhitelisted: true,
                transform: true,
                transformOptions: { enableImplicitConversion: true },
            }),
        );
        await app.init();

        server = app.getHttpServer();
        const res = await request(server).get('/apiEvents/csrf-token');
        csrfCookie = res.headers['set-cookie'][0];
        csrfToken = res.body.csrfToken;
    });

    afterAll(async () => {
        await app.close();
    });

    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('Success Cases', () => {
        beforeEach(() => {
            authStub.requestLogin.mockResolvedValue('tmp');
            authStub.login.mockResolvedValue({ accessToken: 'at', refreshToken: 'rt' });
            authStub.getMe.mockReturnValue({
                sub: 1, name: 'Admin', email: 'admin@cms.sp.gov.br',
                role: 'ADMIN', exp: 999, iat: 111,
            });
            authStub.refreshTokens.mockResolvedValue({ accessToken: 'nat', refreshToken: 'nrt' });
            authStub.logout.mockResolvedValue(undefined);
            authStub.requestPasswordReset.mockResolvedValue('rtok');
            authStub.passwordReset.mockResolvedValue(true);

            usersStub.findAll.mockResolvedValue([
                {
                    id: 1, name: 'User', email: 'user@cms.sp.gov.br', role: 'ADMIN',
                    createdAt: new Date(), updatedAt: new Date(),
                },
            ]);
            usersStub.create.mockResolvedValue({ id: 2, email: 'new@cms.sp.gov.br' });
            usersStub.update.mockResolvedValue({
                id: 3, name: 'Updated', email: 'upd@cms.sp.gov.br', role: 'ADMIN',
                createdAt: new Date(), updatedAt: new Date(),
            });
            usersStub.delete.mockResolvedValue({ message: 'Usuário removido com sucesso.' });

            categoriesStub.findAll.mockResolvedValue([
                { id: 1, name: 'Cat1', createdAt: new Date(), updatedAt: new Date() },
            ]);
            categoriesStub.create.mockResolvedValue({
                id: 2, name: 'Cat2', createdAt: new Date(), updatedAt: new Date(),
            });
            categoriesStub.update.mockResolvedValue({
                id: 3, name: 'Cat3', createdAt: new Date(), updatedAt: new Date(),
            });
            categoriesStub.delete.mockResolvedValue({ message: 'Categoria deletada com sucesso.' });

            carouselStub.findAll.mockResolvedValue([{ id: 1, name: 'Slide1', imageUrl: 'url1', isActive: true, order: 1, createdAt: new Date(), updatedAt: new Date() }]);
            carouselStub.create.mockResolvedValue({ id: 2, name: 'Slide2', imageUrl: 'url2', isActive: false, order: 2, createdAt: new Date(), updatedAt: new Date() });
            carouselStub.update.mockResolvedValue({ id: 3, name: 'Slide3', imageUrl: 'url3', isActive: true, order: 3, createdAt: new Date(), updatedAt: new Date() });
            carouselStub.toggleActive.mockResolvedValue({ id: 1, name: 'Slide1', imageUrl: 'url1', isActive: false, order: 1, createdAt: new Date(), updatedAt: new Date() });
            carouselStub.delete.mockResolvedValue({ message: 'Item do carrossel deletado com sucesso.' });

            eventsStub.findAll.mockResolvedValue([{ id: 1, name: 'Evento1' }]);
            eventsStub.findOne.mockResolvedValue({ id: 1, name: 'Evento1' });
            eventsStub.create.mockResolvedValue({ id: 2, name: 'Novo Evento' });
            eventsStub.update.mockResolvedValue({ id: 2, name: 'Evento Atualizado' });
            eventsStub.remove.mockResolvedValue({ message: 'Evento deletado com sucesso.' });
            eventsStub.getAvailableDates.mockResolvedValue(['2025-01-01']);
            eventsStub.getAvailableTimes.mockResolvedValue([{ start: '07:00', end: '22:00' }]);

            participantsStub.create.mockResolvedValue({
                id: 1,
                name: 'Fulano',
                email: 'fulano@cms.sp.gov.br',
                course: null,
                semester: null,
                ra: null,
                isPresent: false,
                createdAt: new Date(),
                updatedAt: new Date(),
                eventId: 1,
            })
            participantsStub.update.mockResolvedValue({
                id: 1,
                name: 'Fulano',
                email: 'fulano@cms.sp.gov.br',
                course: null,
                semester: null,
                ra: null,
                isPresent: true,
                createdAt: new Date(),
                updatedAt: new Date(),
                eventId: 1,
            })
        });

        it('POST /apiEvents/auth/request-login sets 2fa cookie and returns requires2FA', () =>
            request(server)
                .post('/apiEvents/auth/request-login')
                .set('Cookie', csrfCookie)
                .set('X-CSRF-Token', csrfToken)
                .send({ email: 'admin@cms.sp.gov.br', password: 'P@ssw0rd' })
                .expect(200)
                .expect('set-cookie', /2fa_token=tmp/)
                .expect({ requires2FA: true }));

        it('POST /apiEvents/auth/login sets access and refresh cookies', () =>
            request(server)
                .post('/apiEvents/auth/login')
                .set('Cookie', [csrfCookie, '2fa_token=tmp'])
                .set('X-CSRF-Token', csrfToken)
                .send({ code: '123456' })
                .expect(200)
                .expect('set-cookie', /access_token=at/)
                .expect('set-cookie', /refresh_token=rt/)
                .expect({ message: 'Autenticado com 2FA' }));

        it('GET /apiEvents/auth/me returns user info', () =>
            request(server)
                .get('/apiEvents/auth/me')
                .expect(200)
                .expect({
                    sub: 1, name: 'Admin', email: 'admin@cms.sp.gov.br',
                    role: 'ADMIN', exp: 999, iat: 111,
                }));

        it('POST /apiEvents/auth/logout returns message', () =>
            request(server)
                .post('/apiEvents/auth/logout')
                .set('Cookie', csrfCookie)
                .set('X-CSRF-Token', csrfToken)
                .expect(200)
                .expect({ message: 'Deslogado com sucesso!' }));

        it('POST /apiEvents/auth/request-reset-password sets reset cookie and returns message', () =>
            request(server)
                .post('/apiEvents/auth/request-reset-password')
                .set('Cookie', csrfCookie)
                .set('X-CSRF-Token', csrfToken)
                .send({ email: 'user@cms.sp.gov.br' })
                .expect(200)
                .expect('set-cookie', /reset_token=rtok/)
                .expect({ message: 'O código foi enviado por e-mail' }));

        it('POST /apiEvents/auth/reset-password clears reset cookie and returns message', () =>
            request(server)
                .post('/apiEvents/auth/reset-password')
                .set('Cookie', [csrfCookie, 'reset_token=rtok'])
                .set('X-CSRF-Token', csrfToken)
                .send({ code: '654321', newPassword: 'N3wP@ss!' })
                .expect(200)
                .expect('set-cookie', /reset_token=;/)
                .expect({ message: 'Senha redefinida com sucesso' }));

        it('GET /apiEvents/users returns user list', async () => {
            const res = await request(server).get('/apiEvents/users');
            expect(res.status).toBe(200);
            expect(Array.isArray(res.body)).toBe(true);
            expect(res.body).toHaveLength(1);
            const u = res.body[0];
            expect(u).toMatchObject({
                id: 1, name: 'User', email: 'user@cms.sp.gov.br', role: 'ADMIN',
            });
            expect(typeof u.createdAt).toBe('string');
            expect(typeof u.updatedAt).toBe('string');
        });

        it('POST /apiEvents/users/create returns created user', () =>
            request(server)
                .post('/apiEvents/users/create')
                .set('Cookie', csrfCookie)
                .set('X-CSRF-Token', csrfToken)
                .send({ email: 'new@cms.sp.gov.br', password: 'P@ss1!', role: 'ADMIN', name: 'NewUser' })
                .expect(201)
                .expect({ id: 2, email: 'new@cms.sp.gov.br' }));

        it('PATCH /apiEvents/users/patch/3 returns updated user', async () => {
            const res = await request(server)
                .patch('/apiEvents/users/patch/3')
                .set('Cookie', csrfCookie)
                .set('X-CSRF-Token', csrfToken)
                .send({ name: 'Updated' });
            expect(res.status).toBe(200);
            expect(res.body).toMatchObject({
                id: 3, name: 'Updated', email: 'upd@cms.sp.gov.br', role: 'ADMIN',
            });
            expect(typeof res.body.createdAt).toBe('string');
            expect(typeof res.body.updatedAt).toBe('string');
        });

        it('DELETE /apiEvents/users/delete/5 returns success message', () =>
            request(server)
                .delete('/apiEvents/users/delete/5')
                .set('Cookie', csrfCookie)
                .set('X-CSRF-Token', csrfToken)
                .expect(200)
                .expect({ message: 'Usuário removido com sucesso.' }));

        it('GET /apiEvents/categories returns category list', async () => {
            const res = await request(server).get('/apiEvents/categories');
            expect(res.status).toBe(200);
            expect(Array.isArray(res.body)).toBe(true);
            expect(res.body).toHaveLength(1);
            const c = res.body[0];
            expect(c).toMatchObject({ id: 1, name: 'Cat1' });
            expect(typeof c.createdAt).toBe('string');
            expect(typeof c.updatedAt).toBe('string');
        });

        it('POST /apiEvents/categories/create returns created category', async () => {
            const res = await request(server)
                .post('/apiEvents/categories/create')
                .set('Cookie', csrfCookie)
                .set('X-CSRF-Token', csrfToken)
                .send({ name: 'Cat2' });
            expect(res.status).toBe(201);
            expect(res.body).toMatchObject({ id: 2, name: 'Cat2' });
            expect(typeof res.body.createdAt).toBe('string');
            expect(typeof res.body.updatedAt).toBe('string');
        });

        it('PATCH /apiEvents/categories/patch/3 returns updated category', async () => {
            const res = await request(server)
                .patch('/apiEvents/categories/patch/3')
                .set('Cookie', csrfCookie)
                .set('X-CSRF-Token', csrfToken)
                .send({ name: 'Cat3' });
            expect(res.status).toBe(200);
            expect(res.body).toMatchObject({ id: 3, name: 'Cat3' });
            expect(typeof res.body.createdAt).toBe('string');
            expect(typeof res.body.updatedAt).toBe('string');
        });

        it('DELETE /apiEvents/categories/delete/4 returns success message', () =>
            request(server)
                .delete('/apiEvents/categories/delete/4')
                .set('Cookie', csrfCookie)
                .set('X-CSRF-Token', csrfToken)
                .expect(200)
                .expect({ message: 'Categoria deletada com sucesso.' }));

        it('GET /apiEvents/carousel returns carousel list', async () => {
            const res = await request(server).get('/apiEvents/carousel');
            expect(res.status).toBe(200);
            expect(Array.isArray(res.body)).toBe(true);
            expect(res.body[0]).toMatchObject({ id: 1, name: 'Slide1', isActive: true, order: 1 });
        });

        it('POST /apiEvents/carousel/create returns created slide', () =>
            request(server)
                .post('/apiEvents/carousel/create')
                .set('Cookie', csrfCookie)
                .set('X-CSRF-Token', csrfToken)
                .attach('image', Buffer.from('img'), 'test.png')
                .field('name', 'Slide2')
                .field('isActive', 'false')
                .field('order', '2')
                .expect(201)
                .expect(res => {
                    expect(res.body).toMatchObject({ id: 2, name: 'Slide2', isActive: false, order: 2 });
                }));

        it('PATCH /apiEvents/carousel/patch/3 returns updated slide', () =>
            request(server)
                .patch('/apiEvents/carousel/patch/3')
                .set('Cookie', csrfCookie)
                .set('X-CSRF-Token', csrfToken)
                .attach('image', Buffer.from('img'), 'upd.png')
                .field('name', 'Slide3')
                .expect(200)
                .expect(res => {
                    expect(res.body).toMatchObject({ id: 3, name: 'Slide3' });
                }));

        it('PATCH /apiEvents/carousel/patch/toggle/1 toggles active', () =>
            request(server)
                .patch('/apiEvents/carousel/patch/toggle/1')
                .set('Cookie', csrfCookie)
                .set('X-CSRF-Token', csrfToken)
                .send({ isActive: false })
                .expect(200)
                .expect(res => {
                    expect(res.body).toMatchObject({ id: 1, isActive: false });
                }));

        it('DELETE /apiEvents/carousel/delete/1 returns message', () =>
            request(server)
                .delete('/apiEvents/carousel/delete/1')
                .set('Cookie', csrfCookie)
                .set('X-CSRF-Token', csrfToken)
                .expect(200)
                .expect({ message: 'Item do carrossel deletado com sucesso.' }));

        it('GET /apiEvents/events → 200 & lista', () =>
            request(server)
                .get('/apiEvents/events')
                .expect(200)
                .expect(res => {
                    expect(eventsStub.findAll).toHaveBeenCalled();
                    expect(Array.isArray(res.body)).toBe(true);
                }));

        it('GET /apiEvents/events/:id → 200 & único', () =>
            request(server)
                .get('/apiEvents/events/1')
                .expect(200)
                .expect(res => {
                    expect(eventsStub.findOne).toHaveBeenCalledWith(1);
                    expect(res.body.id).toBe(1);
                }));

        it('POST /apiEvents/events/create → 201 & create', () =>
            request(server)
                .post('/apiEvents/events/create')
                .set('Cookie', csrfCookie)
                .set('X-CSRF-Token', csrfToken)
                .field('name', 'Novo Evento')
                .field('description', 'Uma descrição válida...')
                .field('course', 'ADS')
                .field('maxParticipants', '10')
                .field('isRestricted', 'false')
                .field('location', 'AUDITORIO')
                .field('speakerName', 'Fulano')
                .field('startDate', '2025-01-01')
                .field('startTime', '2025-01-01T09:00:00Z')
                .field('endTime', '2025-01-01T10:00:00Z')
                .attach('image', Buffer.from(''), 'img.png')
                .expect(201)
                .expect(() => {
                    expect(eventsStub.create).toHaveBeenCalled();
                }));

        it('PATCH /apiEvents/events/patch/2 → 200 & update', () =>
            request(server)
                .patch('/apiEvents/events/patch/2')
                .set('Cookie', csrfCookie)
                .set('X-CSRF-Token', csrfToken)
                .field('name', 'Atualizado')
                .attach('image', Buffer.from(''), 'upd.png')
                .expect(200)
                .expect(() => {
                    expect(eventsStub.update).toHaveBeenCalledWith(
                        2,
                        expect.objectContaining({ name: 'Atualizado' }),
                        expect.any(Object),
                    );
                }));

        it('DELETE /apiEvents/events/delete/2 → 200 & remove', () =>
            request(server)
                .delete('/apiEvents/events/delete/2')
                .set('Cookie', csrfCookie)
                .set('X-CSRF-Token', csrfToken)
                .expect(200)
                .expect({ message: 'Evento deletado com sucesso.' }));

        it('GET /apiEvents/events/availability/dates?location=AUDITORIO → 200 & dates', () =>
            request(server)
                .get('/apiEvents/events/availability/dates')
                .query({ location: 'AUDITORIO' })
                .expect(200)
                .expect(['2025-01-01']));

        it('GET /apiEvents/events/availability/times?location=AUDITORIO&date=2025-01-01 → 200 & times', () =>
            request(server)
                .get('/apiEvents/events/availability/times')
                .query({ location: 'AUDITORIO', date: '2025-01-01' })
                .expect(200)
                .expect([{ start: '07:00', end: '22:00' }]));

        it('POST /apiEvents/participants/create → 201 & create', () =>
            request(server)
                .post('/apiEvents/participants/create')
                .set('Cookie', csrfCookie)
                .set('X-CSRF-Token', csrfToken)
                .send({
                    name: 'Fulano',
                    email: 'fulano@cms.sp.gov.br',
                    course: null,
                    semester: null,
                    ra: null,
                    eventId: 1,
                })
                .expect(201)
                .expect(res => {
                    expect(participantsStub.create).toHaveBeenCalledWith({
                        name: 'Fulano',
                        email: 'fulano@cms.sp.gov.br',
                        course: null,
                        semester: null,
                        ra: null,
                        eventId: 1,
                    })
                }))

        it('PATCH /apiEvents/participants/patch/1 → 200 & update', () =>
            request(server)
                .patch('/apiEvents/participants/patch/1')
                .set('Cookie', csrfCookie)
                .set('X-CSRF-Token', csrfToken)
                .send({ isPresent: true })
                .expect(200)
                .expect(res => {
                    expect(participantsStub.update).toHaveBeenCalledWith(1, { isPresent: true })
                }))
    });

    describe('Error Cases', () => {
        it('POST /apiEvents/auth/request-login invalid creds → 401', async () => {
            authStub.requestLogin.mockRejectedValueOnce(new UnauthorizedException('Email incorreto'));
            await request(server)
                .post('/apiEvents/auth/request-login')
                .set('Cookie', csrfCookie)
                .set('X-CSRF-Token', csrfToken)
                .send({ email: 'wrong@cms.sp.gov.br', password: 'BadPass1!' })
                .expect(401, { statusCode: 401, message: 'Email incorreto', error: 'Unauthorized' });
        });

        it('POST /apiEvents/auth/request-login invalid payload → 400', async () => {
            await request(server)
                .post('/apiEvents/auth/request-login')
                .set('Cookie', csrfCookie)
                .set('X-CSRF-Token', csrfToken)
                .send({ email: 'foo', password: 'p' })
                .expect(400)
                .expect(res => {
                    expect(res.body.message[0]).toContain('@fatec.sp.gov.br');
                });
        });

        it('POST /apiEvents/auth/login no 2fa_token → 401', () =>
            request(server)
                .post('/apiEvents/auth/login')
                .set('Cookie', csrfCookie)
                .set('X-CSRF-Token', csrfToken)
                .send({ code: '123456' })
                .expect(401, { statusCode: 401, message: 'Token expirado, solicite novamente!', error: 'Unauthorized' }));

        it('GET /apiEvents/auth/me invalid token → 401', async () => {
            authStub.getMe.mockRejectedValueOnce(new UnauthorizedException('Token inválido ou expirado!'));
            await request(server)
                .get('/apiEvents/auth/me')
                .expect(401, { statusCode: 401, message: 'Token inválido ou expirado!', error: 'Unauthorized' });
        });

        it('POST /apiEvents/auth/request-reset-password no email → 401', async () => {
            authStub.requestPasswordReset.mockRejectedValueOnce(new UnauthorizedException('E-mail não existe!'));
            await request(server)
                .post('/apiEvents/auth/request-reset-password')
                .set('Cookie', csrfCookie)
                .set('X-CSRF-Token', csrfToken)
                .send({ email: 'noone@cms.sp.gov.br' })
                .expect(401, { statusCode: 401, message: 'E-mail não existe!', error: 'Unauthorized' });
        });

        it('POST /apiEvents/auth/reset-password no reset_token → 401', () =>
            request(server)
                .post('/apiEvents/auth/reset-password')
                .set('Cookie', csrfCookie)
                .set('X-CSRF-Token', csrfToken)
                .send({ code: '123456', newPassword: 'NewP@ss1' })
                .expect(401, { statusCode: 401, message: 'Token expirado, solicite novamente!', error: 'Unauthorized' }));

        it('POST /apiEvents/users/create dup email → 409', async () => {
            usersStub.create.mockRejectedValueOnce(new ConflictException('E-mail já cadastrado!'));
            await request(server)
                .post('/apiEvents/users/create')
                .set('Cookie', csrfCookie)
                .set('X-CSRF-Token', csrfToken)
                .send({ email: 'dup@cms.sp.gov.br', password: 'P@ss1!', role: 'ADMIN', name: 'DupUser' })
                .expect(409, { statusCode: 409, message: 'E-mail já cadastrado!', error: 'Conflict' });
        });

        it('POST /apiEvents/users/create invalid email → 400', () =>
            request(server)
                .post('/apiEvents/users/create')
                .set('Cookie', csrfCookie)
                .set('X-CSRF-Token', csrfToken)
                .send({ email: 'foo@gmail.com', password: 'P@ss1!', role: 'ADMIN', name: 'Foo' })
                .expect(400)
                .expect(res => {
                    expect(res.body.message[0]).toContain('@fatec.sp.gov.br');
                }));

        it('PATCH /apiEvents/users/patch/99 not found → 404', async () => {
            usersStub.update.mockRejectedValueOnce(new NotFoundException('Usuário com id 99 não encontrado.'));
            await request(server)
                .patch('/apiEvents/users/patch/99')
                .set('Cookie', csrfCookie)
                .set('X-CSRF-Token', csrfToken)
                .send({ name: 'ValidName' })
                .expect(404, { statusCode: 404, message: 'Usuário com id 99 não encontrado.', error: 'Not Found' });
        });

        it('DELETE /apiEvents/users/delete/100 not found → 404', async () => {
            usersStub.delete.mockRejectedValueOnce(new NotFoundException('Usuário com id 100 não encontrado.'));
            await request(server)
                .delete('/apiEvents/users/delete/100')
                .set('Cookie', csrfCookie)
                .set('X-CSRF-Token', csrfToken)
                .expect(404, { statusCode: 404, message: 'Usuário com id 100 não encontrado.', error: 'Not Found' });
        });

        it('POST /apiEvents/categories/create invalid payload → 400', () =>
            request(server)
                .post('/apiEvents/categories/create')
                .set('Cookie', csrfCookie)
                .set('X-CSRF-Token', csrfToken)
                .send({ name: '' })
                .expect(400)
                .expect(res => {
                    expect(res.body.message[1]).toContain('Nome não pode ser vazio');
                }));

        it('POST /apiEvents/categories/create dup name → 409', async () => {
            categoriesStub.create.mockRejectedValueOnce(new ConflictException('Categoria Dup já existe.'));
            await request(server)
                .post('/apiEvents/categories/create')
                .set('Cookie', csrfCookie)
                .set('X-CSRF-Token', csrfToken)
                .send({ name: 'DupCat' })
                .expect(409, { statusCode: 409, message: 'Categoria Dup já existe.', error: 'Conflict' });
        });

        it('PATCH /apiEvents/categories/patch/5 not found → 404', async () => {
            categoriesStub.update.mockRejectedValueOnce(new NotFoundException('Categoria com o ID 5 não encontrada.'));
            await request(server)
                .patch('/apiEvents/categories/patch/5')
                .set('Cookie', csrfCookie)
                .set('X-CSRF-Token', csrfToken)
                .send({ name: 'ValidCat' })
                .expect(404, { statusCode: 404, message: 'Categoria com o ID 5 não encontrada.', error: 'Not Found' });
        });

        it('PATCH /apiEvents/categories/patch/6 dup name → 409', async () => {
            categoriesStub.update.mockRejectedValueOnce(new ConflictException('Categoria com o nome Zeta já existe.'));
            await request(server)
                .patch('/apiEvents/categories/patch/6')
                .set('Cookie', csrfCookie)
                .set('X-CSRF-Token', csrfToken)
                .send({ name: 'Zeta' })
                .expect(409, { statusCode: 409, message: 'Categoria com o nome Zeta já existe.', error: 'Conflict' });
        });

        it('DELETE /apiEvents/categories/delete/7 not found → 404', async () => {
            categoriesStub.delete.mockRejectedValueOnce(new NotFoundException('Categoria com o ID 7 não encontrada.'));
            await request(server)
                .delete('/apiEvents/categories/delete/7')
                .set('Cookie', csrfCookie)
                .set('X-CSRF-Token', csrfToken)
                .expect(404, { statusCode: 404, message: 'Categoria com o ID 7 não encontrada.', error: 'Not Found' });
        });

        it('POST /apiEvents/carousel/create no file → 409', async () => {
            carouselStub.create.mockRejectedValueOnce(new ConflictException('Imagem obrigatória.'));
            await request(server)
                .post('/apiEvents/carousel/create')
                .set('Cookie', csrfCookie)
                .set('X-CSRF-Token', csrfToken)
                .field('name', 'NoFile')
                .field('isActive', 'true')
                .field('order', '1')
                .expect(409)
                .expect({ statusCode: 409, message: 'Imagem obrigatória.', error: 'Conflict' });
        });

        it('POST /apiEvents/carousel/create dup name → 409', async () => {
            carouselStub.create.mockRejectedValueOnce(new ConflictException(`Já existe uma imagem com o nome "Slide2".`));
            await request(server)
                .post('/apiEvents/carousel/create')
                .set('Cookie', csrfCookie)
                .set('X-CSRF-Token', csrfToken)
                .attach('image', Buffer.from('img'), 'dup.png')
                .field('name', 'Slide2')
                .field('isActive', 'true')
                .field('order', '2')
                .expect(409, { statusCode: 409, message: `Já existe uma imagem com o nome "Slide2".`, error: 'Conflict' });
        });

        it('PATCH /apiEvents/carousel/patch/99 not found → 404', async () => {
            carouselStub.update.mockRejectedValueOnce(new NotFoundException('Imagem com id 99 não encontrado.'));
            await request(server)
                .patch('/apiEvents/carousel/patch/99')
                .set('Cookie', csrfCookie)
                .set('X-CSRF-Token', csrfToken)
                .field('name', 'Abc')
                .expect(404, { statusCode: 404, message: 'Imagem com id 99 não encontrado.', error: 'Not Found' });
        });

        it('PATCH /apiEvents/carousel/patch/toggle/99 not found → 404', async () => {
            carouselStub.toggleActive.mockRejectedValueOnce(new NotFoundException('Slide com id 99 não encontrado.'));
            await request(server)
                .patch('/apiEvents/carousel/patch/toggle/99')
                .set('Cookie', csrfCookie)
                .set('X-CSRF-Token', csrfToken)
                .send({ isActive: false })
                .expect(404, { statusCode: 404, message: 'Slide com id 99 não encontrado.', error: 'Not Found' });
        });

        it('DELETE /apiEvents/carousel/delete/99 not found → 404', async () => {
            carouselStub.delete.mockRejectedValueOnce(new NotFoundException('Carrossel com id 99 não encontrado.'));
            await request(server)
                .delete('/apiEvents/carousel/delete/99')
                .set('Cookie', csrfCookie)
                .set('X-CSRF-Token', csrfToken)
                .expect(404, { statusCode: 404, message: 'Carrossel com id 99 não encontrado.', error: 'Not Found' });
        });

        it('POST /apiEvents/events/create no file → 409', () => {
            eventsStub.create.mockRejectedValueOnce(new ConflictException('Imagem obrigatória.'))
            return request(server)
                .post('/apiEvents/events/create')
                .set('Cookie', csrfCookie)
                .set('X-CSRF-Token', csrfToken)
                .field('name', 'Sem Imagem')
                .field('description', 'Descrição válida para teste')
                .field('course', 'ADS')
                .field('maxParticipants', '10')
                .field('isRestricted', 'false')
                .field('location', 'AUDITORIO')
                .field('speakerName', 'Fulano Teste')
                .field('startDate', '2025-01-01')
                .field('startTime', '2025-01-01T09:00:00Z')
                .field('endTime', '2025-01-01T10:00:00Z')
                .expect(409, {
                    statusCode: 409,
                    message: 'Imagem obrigatória.',
                    error: 'Conflict',
                })
        })

        it('PATCH /apiEvents/events/patch/99 not found → 404', () => {
            eventsStub.update.mockRejectedValueOnce(new NotFoundException('Evento 99 não encontrado.'))
            return request(server)
                .patch('/apiEvents/events/patch/99')
                .set('Cookie', csrfCookie)
                .set('X-CSRF-Token', csrfToken)
                .field('name', 'Abc')
                .expect(404, {
                    statusCode: 404,
                    message: 'Evento 99 não encontrado.',
                    error: 'Not Found',
                })
        })

        it('DELETE /apiEvents/events/delete/99 not found → 404', () => {
            eventsStub.remove.mockRejectedValueOnce(new NotFoundException('Evento 99 não encontrado.'));
            return request(server)
                .delete('/apiEvents/events/delete/99')
                .set('Cookie', csrfCookie)
                .set('X-CSRF-Token', csrfToken)
                .expect(404, {
                    statusCode: 404,
                    message: 'Evento 99 não encontrado.',
                    error: 'Not Found',
                });
        });

        it('GET /apiEvents/events/availability/dates invalid enum → 400', () =>
            request(server)
                .get('/apiEvents/events/availability/dates')
                .query({ location: 'INVALID' })
                .expect(400));

        it('GET /apiEvents/events/availability/times missing date → 200', () =>
            request(server)
                .get('/apiEvents/events/availability/times')
                .query({ location: 'AUDITORIO' })
                .expect(200)
                .expect(() => {
                    expect(eventsStub.getAvailableTimes).toHaveBeenCalledWith('AUDITORIO', undefined, undefined);
                }));

        it('POST /apiEvents/participants/create dup → 409', () => {
            participantsStub.create.mockRejectedValueOnce(
                new ConflictException('Participante duplicado'),
            )
            return request(server)
                .post('/apiEvents/participants/create')
                .set('Cookie', csrfCookie)
                .set('X-CSRF-Token', csrfToken)
                .send({
                    name: 'Fulano',
                    email: 'fulano@cms.sp.gov.br',
                    course: null,
                    semester: null,
                    ra: null,
                    eventId: 1,
                })
                .expect(409, {
                    statusCode: 409,
                    message: 'Participante duplicado',
                    error: 'Conflict',
                })
        })

        it('PATCH /apiEvents/participants/patch/99 not found → 404', () => {
            participantsStub.update.mockRejectedValueOnce(
                new NotFoundException('Participante 99 não encontrado.'),
            )
            return request(server)
                .patch('/apiEvents/participants/patch/99')
                .set('Cookie', csrfCookie)
                .set('X-CSRF-Token', csrfToken)
                .send({ isPresent: true })
                .expect(404, {
                    statusCode: 404,
                    message: 'Participante 99 não encontrado.',
                    error: 'Not Found',
                })
        })
    });
});
