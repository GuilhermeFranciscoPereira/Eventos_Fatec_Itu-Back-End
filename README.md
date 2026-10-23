<img width=100% src="https://capsule-render.vercel.app/api?type=waving&color=40E0D0&height=120&section=header"/>

# 📅 Sistema - Fatec Itu 📅

<p align="left">
  <a href="./README.en.md">
    <img src="https://img.shields.io/badge/🌍%20Click%20here%20to%20read%20in%20english!%20-purple?style=for-the-badge" alt="Ler em inglês"/>
  </a>
</p>

## ⭐ Repositório Back-End

## 📌 Sobre o projeto

### Este sistema foi desenvolvido para tornar as inscrições nos eventos da Faculdade Fatec Itu - Dom Amaury Castanho mais práticas, facilitando o processo tanto para alunos quanto para participantes externos. Além disso, também é utilizado por coordenadores e organizadores para o gerenciamento dos eventos, possibilitando o controle de participantes, a automação na emissão de certificados válidos e outras funcionalidades que otimizam a administração.

### 👥 O sistema está sendo desenvolvido por Guilherme Francisco Pereira como parte do Trabalho de Conclusão de Curso (TCC), com aplicação real e utilização prática.

### ✨ Fato interessante: este é um dos sistemas desenvolvidos exclusivamente por alunos que já está implantado e sendo utilizado ativamente pela faculdade, beneficiando alunos, professores, coordenadores e demais envolvidos!

<img width=100% src="https://capsule-render.vercel.app/api?type=waving&color=40E0D0&height=120&section=footer"/>

##

<img width=100% src="https://capsule-render.vercel.app/api?type=waving&height=120&section=header"/>

## 🛎️ Atualizações deste commit

### `Novo modelo de certificado (./src/modules/certificates/certificates.service.ts):` O PDF do certificado foi redesenhado. Saíram as imagens antigas de cabeçalho e rodapé com fundo azulado, e entrou um layout claro com moldura e cantos no vermelho da Fatec, o logo da Fatec Itu, o título "CERTIFICADO de participação" e o nome do participante em destaque. O texto fica centralizado, com o evento, o palestrante e a carga horária em negrito, e a carga horária não se divide em duas linhas. Embaixo ficam a assinatura e o cargo da coordenadora e o QR Code de verificação com a instrução "Verifique a autenticidade". Nomes longos diminuem para caber em uma linha, e textos de evento, palestrante ou local muito longos usam uma fonte um pouco menor para não encostar na assinatura nem no QR Code. A carga horária agora aparece por extenso e sem partes zeradas ("2 horas e 30 minutos", "3 horas").

### `Imagens e fontes do certificado (./src/assets/certificate):` Saíram `header_certificate.jpeg` e `footer_certificate.jpeg`. Entraram `logo_fatec_itu.png` (o mesmo logo do front-end), `signature_coordinator.png` (a assinatura da coordenadora, recortada do rodapé antigo e com fundo transparente) e a pasta `fonts`, com Poppins (a fonte do site) e Playfair Display (usada no nome do participante) e as licenças OFL das duas.

### `./Dockerfile:` A imagem final copiava só `dist`, `node_modules` e `prisma`, mas o certificado lê as imagens de `src/assets/certificate`: em produção o PDF não era gerado e o certificado não era enviado. Agora essa pasta também é copiada para a imagem.

<img width=100% src="https://capsule-render.vercel.app/api?type=waving&height=120&section=footer"/>

##

## 🖥 Tecnologias Utilizadas
<div align='center'>

!['NestJSLogo'](https://img.shields.io/badge/nestjs-E0234E?style=for-the-badge&logo=nestjs&logoColor=white)
!['TypescriptLogo'](https://img.shields.io/badge/TypeScript-007ACC?style=for-the-badge&logo=typescript&logoColor=white)
!['PrismaLogo'](https://img.shields.io/badge/Prisma-3982CE?style=for-the-badge&logo=Prisma&logoColor=white)
!['MySQLLogo'](https://img.shields.io/badge/MySQL-4479A1?style=for-the-badge&logo=mysql&logoColor=white)
!['DockerLogo'](https://img.shields.io/badge/docker-257bd6?style=for-the-badge&logo=docker&logoColor=white)
!['SwaggerLogo'](https://img.shields.io/badge/Swagger-85EA2D?style=for-the-badge&logo=swagger&logoColor=black)

</div>

## Versões utilizadas:
    - Nest: 11.2.7
    - Typescript: 5.9.3
    - Prisma: 6.19.2
    - MySQL: 8.0.42
    - Docker: 28.3.2
    - Swagger/OpenAPI: @nestjs/swagger 11.4.7

## 🙋🏻‍♂ Como me localizar no projeto?

### Todos os arquivos de código fonte do projeto estão em: `./src` e os testes E2E estão em: `./test`

## 🛈 Como o projeto está estruturado

- `./prisma:` O prisma permite interagir com o banco de dados de forma segura e performática.Ele também cuida do gerenciamento de schema e facilita a criação e execução de migrations, além de oferecer uma API intuitiva para consultas e manipulação de dados.
  - `schema.prisma:` É o arquivo central onde definimos os modelos de dados, relacionamentos e geradores do Prisma Client. Inclui o `sessionVersion` do usuário e as tabelas `AuthCode` (códigos de 2FA e redefinição de uso único) e `AuditLog` (trilha de auditoria).
  - `migrations:` Histórico versionado das alterações do banco, aplicado no deploy com `npx prisma migrate deploy`.

- `./.github/workflows/deploy.yml:` Workflow do GitHub Actions responsável pelo CI/CD do back-end. Ao receber um `git push` na branch `main`, realiza o build da imagem Docker, publica no GitHub Container Registry e atualiza automaticamente o container do back-end na VPS.

- `./Dockerfile:` Arquivo responsável por definir o processo de containerização do back-end. Utiliza Node.js 22 Bookworm Slim e build multi-stage para instalar as dependências com `npm ci`, gerar o Prisma Client com `npx prisma generate`, compilar a aplicação NestJS com `npm run build` e executar a API em modo production na porta `4000`. A imagem final também leva `src/assets/certificate`, com as imagens e fontes usadas no PDF do certificado.

- `./.dockerignore` Define quais arquivos e diretórios devem ser ignorados durante o build da imagem Docker.

- `./test/` Diretório dedicado aos testes de ponta a ponta (e2e):  
  - `app.e2e-spec.ts`: Nossos testes e2e para validar endpoints e fluxos principais da API, garante que os cenários funcionem conforme esperado, fazendo testes de fluxos de sucesso e fluxos de erros, como validação, autorização e etc. Usa a mesma proteção CSRF da aplicação (`createCsrfProtection`).
  - `jest.e2e-json`: Arquivo de configuração do Jest para executar os testes e2e (definição de extensões de arquivo reconhecidas, ponto de partida para busca de testes, transform, e etc.)   

- `./src/app.module.ts`: Módulo raiz que declara/importa os demais módulos, controladores e provedores da aplicação.  
- `./src/main.ts`: Ponto de entrada da aplicação, aqui o Nest é inicializado e configurado (Helmet, CORS, cookies, proteção CSRF com `csrf-csrf`, validação global e Swagger).
- `./src/swagger.ts`: Configuração central da documentação Swagger/OpenAPI, incluindo título, descrição, versão, servidores, autenticação por cookies, CSRF, tags e rota da interface em `/apiEvents/docs`.

- `./src/assets:` diretório para organizar recursos estáticos adicionais.
  - `certificate:` Logo da Fatec Itu, assinatura da coordenadora e fontes (Poppins e Playfair Display, com as licenças OFL) usadas no PDF do certificado.
  - `readme:` Pasta que irá armazenar nossas fotos para utilizar na documentação ( README )

- `./src/decorators:` Pasta para decorators customizados.
  - `audit.decorator.ts:` Define os decorators `@Audit`, que descreve como uma rota aparece na auditoria (ação, área, resumo e de onde vem o registro afetado), e `@SkipAudit`, para chamadas automáticas que não são um ato do usuário, como a renovação da sessão.
  - `public.decorator.ts:` Define um decorator para liberar rotas publicas para usuários não autenticados.
  - `roles.decorator.ts:` Define um decorator para indicar quais perfis de usuário têm permissão para acessar cada endpoint.

- `./src/guards:` Pasta para guards de autenticação e autorização.
  - `jwt-auth.guard.ts:` Garante que apenas requisições autenticadas com token JWT válido sejam aceitas e popula os dados do usuário na requisição.
  - `roles.guard.ts:` Controla acesso a partir do perfil do usuário, liberando endpoints sem restrição e bloqueando quando o perfil não corresponde aos permitidos. Cada acesso negado fica registrado na auditoria.
  - `roles.guard.spec.ts:` Testes do guard: perfil permitido, perfil recusado com registro na auditoria e requisição sem usuário.

- `./src/modules:` A pasta modules reúne todos os módulos da aplicação, cada um em seu próprio diretório para manter lógica, controladores e provedores bem organizados e desacoplados, depois todos importados pelo módulo raiz (AppModule)
  - `audit:` Módulo da trilha de auditoria: registra quem fez o quê, quando e com qual resultado, sem guardar senhas, códigos ou tokens.
    - `dto:` Data Transfer Objects da listagem (filtros e paginação) e das respostas resumida e detalhada.
    - `audit.context.ts:` Contexto da requisição (AsyncLocalStorage) que permite aos services informar o responsável, o registro afetado e detalhes extras, como no login ou na otimização de uma imagem.
    - `audit.controller.ts:` Expõe `GET /audit` (paginado, do mais recente para o mais antigo, com busca e filtros por resultado, área, ação e período em horário de Brasília) e `GET /audit/:id` (todos os detalhes), ambos exclusivos do ADMIN.
    - `audit.interceptor.ts:` Interceptor global que registra cada alteração feita pela API e as rotas marcadas com `@Audit`: lê o registro antes e depois, calcula o que mudou e guarda o resultado, inclusive quando a operação falha ou é recusada.
    - `audit.interceptor.spec.ts:` Testes do interceptor: edição com antes/depois, criação, login recusado, erro de regra de negócio, dados informados pelos services, senha como alteração protegida, visualização de lista e rotas com `@SkipAudit`.
    - `audit.module.ts:` Módulo global que registra o AuditService, o AuditController e o interceptor.
    - `audit-sanitizer.ts:` Funções que mascaram senhas, códigos, tokens, hashes e segredos, limitam o tamanho do que é guardado e calculam a diferença campo a campo.
    - `audit-sanitizer.spec.ts:` Testes do mascaramento, do limite de tamanho e do cálculo do que mudou.
    - `audit.service.ts:` Grava os registros (uma falha ao gravar nunca desfaz a operação do usuário), monta o retrato de cada registro afetado com os nomes das relações, lista e detalha os registros e apaga os mais antigos que o prazo de retenção.
    - `audit.service.spec.ts:` Testes da gravação sem credenciais, do retrato dos registros, da paginação com filtros e da retenção.
    - `audit.utils.ts:` Funções compartilhadas: responsável a partir da sessão, área a partir do controller, resultado a partir do código HTTP e origem da requisição.

  - `auth:` Módulo dedicado a todo o fluxo de autenticação e autorização do usuário.
    - `dto:` Pasta com os Data Transfer Objects que definem o formato de entrada e saída das requisições de autenticação, em resumo, é a nossa "Tipagem".
    - `auth.controller.ts:` Expõe os endpoints de me, refresh, logout, request-login, login, request-reset-password e reset-password, gerencia cookies de acesso, refresh, 2FA e redefinição (criados e apagados com as mesmas opções, para serem removidos de verdade) e fornece uma rota própria para renovar sessão sem depender do carregamento inicial do front-end. O pedido de redefinição responde sempre a mesma mensagem, exista ou não o e-mail, e uma sessão encerrada também tem os cookies apagados.
    - `auth.controller.spec.ts:` Cobre testes de integração do controller, validando cenários de token válido, token expirado, renovação via refresh, sessão encerrada com cookies apagados, ausência de refresh token, logout, login com 2FA, resposta neutra da redefinição e reset de senha
    - `auth.service.ts:` Encapsula toda a lógica de negócio de autenticação — verificação de usuário, hash de senha, geração e verificação de tokens de acesso, rotação de refresh tokens (sempre com o perfil atual do banco e o `sessionVersion`; 3 dias sem uso, ou 30 dias com "Lembrar-me"), códigos de 2FA e redefinição de uso único guardados na tabela `AuthCode`, resposta igual para e-mails existentes ou não, encerramento das sessões na troca de senha, envio de e-mails em segundo plano e limpeza de tokens e códigos expirados
    - `auth.service.spec.ts:` Testa os fluxos do serviço de autenticação, garantindo comportamento correto em casos de credenciais inválidas, geração de tokens, códigos de uso único (inclusive após reiniciar a API), bloqueio após 5 tentativas, resposta neutra na redefinição, encerramento das sessões, perfil vindo do banco no refresh, revogação e renovação de refresh tokens
    - `auth.module.ts:` Configura o módulo de autenticação, importa PrismaModule, ConfigModule, JwtModule com chaves RSA carregadas de variáveis de ambiente, e registra AuthService, JwtStrategy e EmailService  
    - `jwt.strategy.ts:` Extrai o JWT do cookie de acesso, valida sua assinatura e expiração usando a chave pública, confere no banco se o usuário existe e se o `sessionVersion` do token ainda é o atual, e fornece os dados de usuário (id, nome, e-mail e perfil vindo do banco) para os guards
  
  - `carousel:` Pacote dedicado ao gerenciamento completo das coleções de imagens exibidas em carrossel no sistema, englobando todas as operações de CRUD e apresentação das fotos.
    - `dto:` Diretório que contém os Data Transfer Objects (CreateCarouselDto, UpdateCarouselDto e CarouselResponseDto) responsáveis por definir a forma dos dados de entrada e saída nas requisições de carrossel.
    - `carousel.controller.ts:` Define os endpoints REST para listagem (GET /carousel), criação (POST /carousel/post), atualização (PATCH /carousel/patch/:id), atualização apenas do campo de isActive (PATCH patch/toggle/:id) e remoção (DELETE /carousel/delete/:id) dos itens de imagem no carrossel.
    - `carousel.controller.spec.ts:` Testes de integração do controller, assegurando que cada rota encaminhe corretamente as chamadas ao CarouselService e retorne os códigos HTTP esperados.
    - `carousel.service.ts:` Implementa a lógica de negócio do carrossel — interage com o PrismaClient para buscar, inserir, alterar e excluir registros na tabela Carousel, e integração com o módulo de Cloudinary para salvar e excluir as imagens na claudinary.
    - `carousel.service.spec.ts:` Conjunto de testes unitários do serviço, com uma tabela em memória, cobrindo cenários de sucesso e falha para cada método exposto por CarouselService, inclusive a reorganização da ordem e a troca de imagem.
    - `carousel.module.ts:` Arquivo de configuração do módulo de carrossel, importando PrismaModule e CloudinaryModule, registrando CarouselService e CarouselController no contexto do NestJS. O upload da imagem é tratado pelo `ImageUploadInterceptor`.

  - `categories:` Pacote dedicado ao gerenciamento completo de categorias, englobando todas as operações de CRUD.
    - `dto:` Diretório que contém os Data Transfer Objects (CreateCategoryDto, UpdateCategoryDto e CategoryResponseDto) responsáveis por modelar os dados de entrada e saída nas requisições de categorias.
    - `categories.controller.ts:` Define os endpoints REST para listagem (GET /categories), criação (POST /categories), atualização (PATCH /categories/:id) e remoção (DELETE /categories/:id) de categorias.
    - `categories.controller.spec.ts:` Testes de integração do controller, garantindo que cada rota encaminhe corretamente as chamadas ao CategoriesService e retorne os códigos HTTP esperados.
    - `categories.service.ts:` Implementa a lógica de negócio das categorias — interage com o PrismaClient para buscar, inserir, alterar e excluir registros na tabela Category.
    - `categories.service.spec.ts:` Conjunto de testes unitários do serviço, cobrindo cenários de sucesso e falha para cada método exposto pelo CategoriesService.
    - `categories.module.ts:` Arquivo de montagem do módulo de categorias, importando o PrismaModule e registrando o CategoriesService e CategoriesController no contexto do NestJS.

  - `certificates:` Módulo responsável por armazenar e exportar a lógica de envio de certificado para os alunos que estão como presentes no evento.
    - `certificates.module.ts:` Importa o ScheduleModule.forRoot() e o PrismaModule e exporta o service para ser utilizado em outros locais do código
    - `certificates.controller.ts:` Disponibiliza a rota para validação se o certificado é real ou não e se pertence a pessoa.
    - `certificates.service.ts:` Toda a lógica para envio do certificado para os alunos que estavam presentes nos eventos do dia anterior, incluindo o desenho do PDF (A4 deitado, com logo, nome do participante, dados do evento, assinatura da coordenadora e QR Code de verificação).

  - `cloudinary:` Exporta a opção de inserir ou remover fotos da cloudinary - ( serviço gratuito para salvar imagens, recomendo: https://cloudinary.com)
    - `cloudinary.module.ts:` Importa o nosso provider e service e exporta o service para ser utilizado em outros locais do código
    - `cloudinary.provider.ts:` Configura a conexão com a Cloudinary
    - `cloudinary.service.ts:` Exporta as funções para subir e deletar uma foto. Envia o arquivo do disco (ou da memória) para a Cloudinary depois de passar pelo otimizador e responde com uma mensagem amigável quando a Cloudinary recusa o envio.
    - `image-optimizer.ts:` Otimiza apenas imagens acima de 5 MB: reduz para no máximo 2560 px no maior lado e converte para WebP com o `sharp`. Se o resultado não ficar menor ou a imagem não puder ser processada, envia a original.
    - `image-optimizer.spec.ts:` Testes do otimizador: imagem leve mantida, imagem pesada reduzida e convertida com o arquivo temporário apagado e arquivo inválido enviado como está.

  - `common:` Concentramos funcionalidades compartilhadas por vários módulos, é nesse nível que ficam componentes que não pertencem a um domínio específico.
    - `csrf.controller.ts:` Expõe um endpoint para obter o token CSRF do usuário, garantindo que cada chamada realmente venha da aplicação legítima e não de um site mal-intencionado, evitando CSRF.
    - `csrf.ts:` Cria a proteção CSRF com o `csrf-csrf` (substituto do `csurf`, descontinuado), mantendo o mesmo contrato com o front-end: `GET /csrf-token` devolve o token e toda alteração envia o cabeçalho `X-CSRF-Token`.
    - `event-clock.ts:` Converte o momento atual para o horário de Itu no mesmo formato em que os horários dos eventos são gravados, para que as comparações com "agora" (eventos públicos, datas disponíveis, inscrições e certificados) não dependam do fuso horário do servidor.
    - `image-upload.interceptor.ts:` Interceptor usado nos uploads de imagem (eventos, carrossel e foto de perfil): grava o arquivo na pasta temporária em vez da memória, aceita só JPG, PNG, WEBP, GIF ou AVIF conferindo os primeiros bytes do arquivo e apaga o arquivo temporário ao fim da requisição. Não limita o tamanho.
    - `image-upload.interceptor.spec.ts:` Testes da identificação das imagens pelos primeiros bytes e da recusa de arquivos que não são imagem.

   - `courses:` Pacote dedicado ao gerenciamento completo de cursos, englobando todas as operações de CRUD.
    - `dto:` Diretório que contém os Data Transfer Objects (CreateCourseDto, UpdateCourseDto e CourseResponseDto) responsáveis por modelar os dados de entrada e saída nas requisições de cursos.
    - `courses.controller.ts:` Define os endpoints REST para listagem (GET /courses), criação (POST /courses), atualização (PATCH /courses/:id) e remoção (DELETE /courses/:id) de cursos.
    - `courses.controller.spec.ts:` Testes de integração do controller, garantindo que cada rota encaminhe corretamente as chamadas ao coursesService e retorne os códigos HTTP esperados.
    - `courses.service.ts:` Implementa a lógica de negócio das cursos — interage com o PrismaClient para buscar, inserir, alterar e excluir registros na tabela Course.
    - `courses.service.spec.ts:` Conjunto de testes unitários do serviço, cobrindo cenários de sucesso e falha para cada método exposto pelo CoursesService.
    - `courses.module.ts:` Arquivo de montagem do módulo de cursos, importando o PrismaModule e registrando o CoursesService e CoursesController no contexto do NestJS.

  - `events:` Pacote dedicado ao gerenciamento completo de eventos, englobando operações de CRUD, upload de imagem, consulta de disponibilidade de datas e horários e validação de presença por palavra secreta.
    - `dto:` Diretório com os Data Transfer Objects (CreateEventDto, UpdateEventDto, ValidatePresenceDto e EventResponseDto) responsáveis por definir o formato dos dados de entrada e saída nas requisições de eventos.
    - `events.controller.ts:` Define os endpoints REST para listagem (GET /events), busca pública por ID (GET /events/:id, sem participantes nem palavra secreta), busca completa por ID para edição (GET /events/manage/:id), consulta das inscrições de um participante por e-mail (GET /events/manage/by-participant-email, apenas para ADMIN, COORDENADOR e AUXILIAR e registrada na auditoria), criação (POST /events/create), atualização parcial (PATCH /events/patch/:id), remoção (DELETE /events/delete/:id), confirmação de presença por palavra secreta e e-mail da inscrição (PATCH /events/:eventId/participants/:participantId/presence, limitada a 10 tentativas por minuto), disponibilidade de datas (GET /events/availability/dates) e disponibilidade de horários (GET /events/availability/times). Todos protegidos por JwtAuthGuard e RolesGuard, com decorator @Roles para perfis ADMIN e COORDENADOR, o `ImageUploadInterceptor` para o upload de imagem e códigos HTTP apropriados (201 para criação, 200 para remoção), apenas as rotas públicas não necessitam estar autenticadas, como a listagem pública de eventos e a confirmação de presença.
    - `events.service.ts:` Implementa toda a lógica de negócio de eventos — interage com o PrismaClient para operações de CRUD, valida conflitos de horários para evitar sobreposição, utiliza o CloudinaryService para upload e exclusão de imagens, calcula dinamicamente os slots livres de datas e horários conforme o local e data informados, garante que as rotas públicas retornem apenas os dados públicos do evento e valida a palavra secreta e o e-mail da inscrição para marcar o participante como presente.
    - `events.service.spec.ts:` Conjunto de testes unitários do EventsService, cobrindo cenários de criação sem arquivo, detecção de sobreposição de horários, criação bem-sucedida com upload de imagem, atualização com e sem novo arquivo (incluindo exclusão e upload no Cloudinary), cálculo de disponibilidade de horários e datas para diferentes locais, remoção de evento com exclusão de imagem, e tratamento de exceções ConflictException e NotFoundException.
    - `events.controller.spec.ts:` Testes do controller: consulta por e-mail exigindo login e perfil, registro na auditoria, ausência da antiga rota pública e repasse da confirmação de presença.
    - `events.module.ts:` Arquivo de configuração do módulo de eventos, importando PrismaModule e CloudinaryModule, e registrando EventsService e EventsController no contexto do NestJS.

  - `locations:` Pacote dedicado ao gerenciamento completo de locais, englobando todas as operações de CRUD e servindo como base relacional para o cadastro de eventos.
    - `dto:` Diretório que contém os Data Transfer Objects (`CreateLocationDto`, `UpdateLocationDto`, `LocationResponseDto` e `LocationPublicResponseDto`) responsáveis por modelar os dados de entrada e saída nas requisições de locais.
    - `locations.controller.ts:` Define os endpoints REST para listagem administrativa (GET /locations), listagem pública (GET /locations/publicAllLocations), criação (POST /locations/create), atualização (PATCH /locations/patch/:id) e remoção (DELETE /locations/delete/:id) dos locais cadastrados no sistema.
    - `locations.service.ts:` Implementa a lógica de negócio dos locais — interage com o PrismaClient para buscar, inserir, alterar e excluir registros na tabela `Location`, incluindo validações de existência, conflitos de nome duplicado e proteção contra exclusão de locais vinculados a eventos.
    - `locations.controller.spec.ts:` Testes do controller: listagem pública liberada, repasse das operações ao service e registro na auditoria.
    - `locations.service.spec.ts:` Testes do service: nomes duplicados, local inexistente e bloqueio da exclusão de locais vinculados a eventos.
    - `locations.module.ts:` Arquivo de configuração do módulo de locais, importando o PrismaModule e registrando o LocationsService e LocationsController no contexto do NestJS.

  - `participants:` Módulo dedicado ao fluxo completo de inscrição e controle de presença de participantes em eventos
    - `dto:` Contém os Data Transfer Objects (CreateParticipantDto, UpdateParticipantDto e ParticipantResponseDto) que definem a forma dos dados de entrada e saída nas operações de participantes
    - `participants.controller.ts:` Expõe os endpoints de cadastro (POST /participants/create) e de atualização de presença (PATCH /participants/patch/:id), aplica JwtAuthGuard e RolesGuard para ADMIN, COORDENADOR e AUXILIAR, e marca a rota de criação como pública
    - `participants.controller.spec.ts:` Conjunto de testes de integração que valida cadastro público, tentativas de acesso sem autenticação e atualização de presença autorizada
    - `participants.service.ts:` Encapsula toda a lógica de negócio de inscrição e presença, incluindo verificação de e-mail e RA duplicados por evento, validação de domínio institucional, incremento do contador de participantes, persistência do registro e envio de e-mail de confirmação
    - `participants.service.spec.ts:` Testes unitários do serviço, cobrindo cenários de conflito de e-mail/RA, criação de participante, atualização de presença e disparo de e-mail de confirmação
    - `participants.module.ts:` Configura o módulo de participantes importando PrismaModule, declarando ParticipantsService e EmailService como providers, e registrando ParticipantsController como controller

  - `prisma:` Agrupa o PrismaModule (prisma.module.ts) e o PrismaService (prisma.service.ts), centralizando a integração do Prisma no NestJS.
    - `prisma.module.ts`: Define e exporta globalmente o módulo do Prisma no NestJS, registrando o PrismaService como provedor para permitir injeção em qualquer parte da aplicação.
    - `prisma.service.ts`: Estende o PrismaClient, gerenciando automaticamente a conexão ao banco de dados ao inicializar e desconectar no ciclo de vida do módulo.
  
  - `users:` Módulo responsável por todas as operações de CRUD de usuários.
    - `dto:` Pasta com os Data Transfer Objects que definem o formato de entrada e saída das requisições de usuários, em resumo, é a nossa "Tipagem".
    - `users.controller.ts`: Expõe os endpoints de get, post, patch e delete para o crud de usuários.
    - `users.controller.spec.ts`: Testes de integração do controller, garantindo que cada rota invoque corretamente o UsersService.
    - `users.service.ts:` Lógica de negócio do módulo de usuários, tratando as requisições que chegam nas rotas do controller, buscando todos os usuários, registrando, atualizando e removendo. Ao trocar a senha ou o perfil de um usuário, aumenta o `sessionVersion` e revoga os refresh tokens, encerrando na hora todas as sessões abertas dele.
    - `users.service.spec.ts:` Testes unitários do UsersService, cobrindo cenários de sucesso e erro para cada método.
    - `users.module.ts:` Configura o UsersModule, importando PrismaModule e ConfigModule, e registrando UsersService e UsersController.
    
  - `./src/services:` Reúne classes injetáveis que encapsulam lógica de negócio, utilitários e integrações externas.
  
  - `email.service.ts:` Temos as configurações para o envio de email e o método send que por onde realmente vamos utilizar para o envio dos e-mails

## ❔ Como rodar o projeto na minha máquina?

- O projeto pode ser executado de duas formas, ambas vão ser ensinadas abaixo:
    - Localmente, rodando o código na sua máquina.
    - Via Docker, subindo o front-end em container mas não se esqueça de no meu github também pegar o back-end para subir na nuvem também.

- Antes de tudo, você precisa ter o Git instalado no seu computador. O Git é uma ferramenta que permite clonar e gerenciar repositórios de código.
    - Windows: Baixe o Git <a href="https://git-scm.com/download/win" target="_blank">aqui</a> e siga as instruções de instalação.
    - macOS: Você pode instalar o Git <a href="https://git-scm.com/download/mac" target="_blank">aqui</a> ou usando o Homebrew com o comando brew install git:
        ```bash
        brew install git
        ```

    - Linux: Use o gerenciador de pacotes da sua distribuição, por exemplo para Debian/Ubuntu:
        ```bash
        sudo apt install git
        ```

- Abra o terminal (no Windows, você pode usar o Git Bash, que é instalado junto com o Git).

- Navegue até o diretório onde deseja armazenar o projeto.

- Execute o comando para clonar o repositório:

    ```bash
    git clone https://github.com/GuilhermeFranciscoPereira/Eventos_Fatec_Itu-Back-End.git
    ```
    
- Após clonar o repositório, navegue até a pasta do projeto
    ```bash
    cd Eventos_Fatec_Itu-Back-End.git
    ```

- Agora você pode abrir os arquivos do projeto com seu editor de texto ou IDE preferido. Exemplo do vsCode: 
    ```bash
    code .
    ```

- 🚨 Não esqueça que para não ocorrer erros no código ao clonar ele, você deve fazer o comando abaixo 🚨
    ```bash
    npm i   
    ```

- 🚨 Para não ter erros você também deve atualizar o prisma para seu banco de dados, para isso rode o comando abaixo antes de executar o código! 🚨
    ```bash
    npx prisma generate
    ```

- Ao ter o projeto na sua máquina você deve abrir o site. Para isso siga os passos abaixo:
    - Lembre-se de criar o arquivo .env com base em tudo que contém no arquivo: `.env.example`
    - Abra o terminal e escreva o código abaixo para iniciar o site:
      ```bash
      npm run start:dev
      ```

##

## 📚 Documentação Swagger/OpenAPI

### O Swagger no projeto é a documentação interativa da API do back-end. Ele mostra os endpoints, métodos HTTP, parâmetros, DTOs, respostas, rotas públicas, rotas privadas, permissões e requisitos de autenticação.

- `Desenvolvimento:` com o back-end rodando localmente e `GLOBAL_PREFIX=apiEvents`, acesse:
  ```txt
  http://localhost:4000/apiEvents/docs
  ```

- `Produção:` a documentação fica disponível em:
  ```txt
  https://agendafatecitu.com.br/apiEvents/docs
  ```

- `OpenAPI JSON:` quando precisar importar a especificação em outras ferramentas, use:
  ```txt
  https://agendafatecitu.com.br/apiEvents/docs-json
  ```

- `Rotas públicas:` podem ser testadas diretamente pelo Swagger, como listagens públicas, inscrição de participante, validação de presença e verificação de certificados. Para métodos `POST`, `PATCH` e `DELETE`, obtenha antes o token em `GET /csrf-token` e envie no esquema `csrf-token`.

- `Rotas privadas/autenticadas:` exigem sessão válida por cookies HTTP-only. O fluxo recomendado é pegar o CSRF em `GET /csrf-token`, executar o login pelo fluxo `request-login` e `login`, manter os cookies do navegador ativos e testar as rotas protegidas com o cabeçalho `X-CSRF-Token` quando houver alteração de dados.

- `Cookies e sessão:` o `access_token` identifica a sessão de curta duração, o `refresh_token` permite renovar a sessão em `/auth/refresh` e o `X-CSRF-Token` protege requisições que modificam dados. Como os cookies são HTTP-only, eles não devem ser copiados manualmente para ambientes compartilhados.

- `Cuidados:` não utilize credenciais reais em computadores públicos, prints, gravações, ambientes compartilhados ou durante demonstrações abertas. Prefira usuários de teste e encerre a sessão ao finalizar.

##

## 🐳 Comandos Docker

### Após os 3 arquivos geramos a imagem do docker e rodamos:
``` bash
docker-compose up --build -d
```

### Isso vai:
- Iniciar o container MySQL (db)
- Subir o Nest (app)

### Verifique se o container está mesmo up e com a porta mapeada

```bash
docker-compose ps
```

### Abre na porta que estiver aparecendo, por exemplo:

```bash
http://localhost:xxxx
```

### Para reiniciar o backend quando mudar o código:

```bash
docker-compose restart backend_events-fatec-itu
```

### Para reiniciar o banco de dados quando mudar o código:

```bash
docker-compose restart db_events-fatec-itu
```

### Para reiniciar tudo de uma só vez:

```bash
docker-compose restart
```

### Parar só o db

```bash
docker-compose stop db_events-fatec-itu
```

### Parar só o backend

```bash
docker-compose stop backend_events-fatec-itu
```

### Se você quiser remover o container (além de pará-lo), use rm:

```bash
docker-compose rm db
```

```bash
docker-compose rm backend
```
### Quando quiser parar tudo de uma vez:

```bash
docker-compose down -v
```

### Caso queira o 'hot reload' para sempre alterar com mudanças você pode alterar o `docker-compose.yml` e adicionar:

```bash
    volumes:
      - ./:/app
      - /app/node_modules
    command: npm run start:dev
```

##

## 🧪 Como rodar os testes unitários e End-To-End (e2e)?

### Testes unitários: você possui duas formas, rodar todos os testes unitários deu uma só vez ou um de cada vez.

- `Todos os testes unitários de uma só vez:` 
  ```bash
  npm run test
  ```

- `Testando um teste unitário especifico:` 
Comando: `npx jest` acompanhado do nome do módulo, exemplo: `users` e o nome do arquivo, por exemplo: `users.service.spec.ts` e sempre respeitando a hierarquia de pastas, se os módulos estiverem dentro de uma pasta modules deve conter isso após o src
  - Ficando desta maneira:
    ```bash
    npx jest src/modules/users/users.service.spec.ts
    ```

### Testes End-To-End (e2e):

- Para rodar os teste e2e você deve apenas escrever um comando e realizará todo o teste da aplicação com os casos de sucesso e os casos de falha:
  ```bash
  npm run test:e2e
  ```

##

## ⚠️ Informações importantes sobre o projeto ⚠️

### 📝 Todos os commits do projeto possuem um readme detalhado do que foi feito naquele commit como mostrado de exemplo na imagem abaixo, então caso deseje ver o processo de criação do código viaje pelos commits e veja as informações! Exemplo:

## 
![Exemplo de como é o processo da criação do projeto no readme](./src/assets/readme/example_howToReadTheCommits.jpg)
##

### ❔ Como fazer isso? 

### 👇🏻 Para você ver o processo de criação e o que foi feito em cada commit siga o passo-a-passo:

##

### 1 - Nesta mesma guia em que você está, suba a tela até encontrar embaixo do botão verde o local em que está circulado da foto abaixo e então clique nele
![1 passo - Como ver o processo da criação do projeto](./src/assets/readme/firstStep_howToReadTheCommits.png)

##

### 2 - No lado direito dos commits você encontra um simbolo de <> como está circulado na foto abaixo e então você clica neste simbolo e irá encontrar como o código estava naquele momento e o readme detalhado daquele momento!
![2 passo - Como ver o processo da criação do projeto](./src/assets/readme/secondStep_howToReadTheCommits.png)

##

### 3 - Depois de encontrar tudo que deseja, caso queira voltar o commit atual, você irá clicar no local em que a imagem a baixo circula:
![3 passo - Como ver o processo da criação do projeto](./src/assets/readme/thirdStep_howToReadTheCommits.png)

##

### 4 - E então clique em main ( onde está circulado na foto abaixo ) e voltará para o último commit realizado!
![4 passo - Como ver o processo da criação do projeto](./src/assets/readme/fourthStep_howToReadTheCommits.png)

##

## 🎉  É isso! Esse é o sistema da Fatec Itu para eventos, caso tenha ficado com alguma dúvida ou deseje complementar algo diretamente comigo você pode estar entrando em contato através do meu LinkedIn:
> Link do meu LinkedIn: <a href="https://www.linkedin.com/in/guilherme-francisco-pereira-4a3867283" target="_blank">https://www.linkedin.com/in/guilherme-francisco-pereira-4a3867283</a>

### 🚀 Obrigado pela atenção e espero que tenha gostado do que tenha visto aqui, que tal agora dar uma olhada nos meus outros repositórios? 👋🏻

#

### ❤️ Créditos:

#### Créditos primários à Fatec itu por ceder seu nome, e utilizar o sistema em seu ambiente!
> <a href="https://fatecitu.cps.sp.gov.br" target="_blank">https://fatecitu.cps.sp.gov.br</a>

#### Créditos à Cloudinary por utilizar os serviços:
> <a href="https://cloudinary.com" target="_blank">https://cloudinary.com</a>

#### Créditos dos emojis: 
> <a href="https://emojipedia.org" target="_blank">https://emojipedia.org</a>

- #### Créditos dos badges: 
> <a href="https://shields.io" target="_blank">https://shields.io</a>
