import { ConfigService } from '@nestjs/config';
import { INestApplication } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

function joinUrl(baseUrl: string, prefix: string): string {
  const cleanBaseUrl = baseUrl.replace(/\/$/, '');
  const cleanPrefix = prefix.replace(/^\/|\/$/g, '');
  return cleanPrefix ? `${cleanBaseUrl}/${cleanPrefix}` : cleanBaseUrl;
}

export function configureSwagger(app: INestApplication, config: ConfigService): void {
  const globalPrefix = config.get<string>('GLOBAL_PREFIX', '');
  const port = config.get<number>('PORT', 3000);
  const accessCookieName = config.get<string>('ACCESS_COOKIE_NAME', 'access_token') || 'access_token';
  const refreshCookieName = config.get<string>('REFRESH_COOKIE_NAME', 'refresh_token') || 'refresh_token';
  const localServerUrl = joinUrl(`http://localhost:${port}`, globalPrefix);

  const swaggerConfig = new DocumentBuilder()
    .setTitle('Agenda Fatec Itu API')
    .setDescription(
      [
        'Documentação OpenAPI do back-end da plataforma de eventos da Fatec Itu.',
        'Rotas públicas podem ser testadas diretamente.',
        'Rotas privadas usam cookies HTTP-only de sessão, com access token e refresh token, e exigem o cabeçalho X-CSRF-Token em métodos que alteram dados.',
        'Para testar rotas autenticadas pelo Swagger, obtenha o token em GET /csrf-token, informe-o no esquema csrf-token, faça o fluxo de login e mantenha os cookies do navegador ativos.',
        'Não utilize credenciais reais em ambientes compartilhados ou públicos.',
      ].join(' '),
    )
    .setVersion('1.0.0')
    .addServer('https://agendafatecitu.com.br/apiEvents', 'Produção')
    .addServer(localServerUrl, 'Desenvolvimento')
    .addCookieAuth(accessCookieName, {
      type: 'apiKey',
      in: 'cookie',
      name: accessCookieName,
      description: 'Cookie HTTP-only com access token JWT de curta duração.',
    }, 'access-token')
    .addCookieAuth(refreshCookieName, {
      type: 'apiKey',
      in: 'cookie',
      name: refreshCookieName,
      description: 'Cookie HTTP-only usado para renovar a sessão pela rota /auth/refresh.',
    }, 'refresh-token')
    .addApiKey({
      type: 'apiKey',
      in: 'header',
      name: 'X-CSRF-Token',
      description: 'Token obtido em GET /csrf-token e enviado em requisições POST, PATCH e DELETE.',
    }, 'csrf-token')
    .addTag('Auth', 'Autenticação, sessão, 2FA e recuperação de senha')
    .addTag('CSRF', 'Token de proteção CSRF')
    .addTag('Carousel', 'Gerenciamento e consulta pública do carrossel')
    .addTag('Categories', 'Gerenciamento e consulta pública de categorias')
    .addTag('Certificates', 'Validação pública de certificados')
    .addTag('Courses', 'Gerenciamento e consulta pública de cursos')
    .addTag('Events', 'Gerenciamento, consulta pública, disponibilidade e presença em eventos')
    .addTag('Locations', 'Gerenciamento e consulta pública de locais')
    .addTag('Participants', 'Inscrição pública e controle administrativo de participantes')
    .addTag('Users', 'Gerenciamento administrativo de usuários')
    .build();

  const document = SwaggerModule.createDocument(app, swaggerConfig, {
    deepScanRoutes: true,
  });

  SwaggerModule.setup('docs', app, document, {
    useGlobalPrefix: true,
    jsonDocumentUrl: 'docs-json',
    customSiteTitle: 'Agenda Fatec Itu API Docs',
    swaggerOptions: {
      persistAuthorization: true,
      withCredentials: true,
      tagsSorter: 'alpha',
      operationsSorter: 'method',
    },
  });
}
