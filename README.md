<img width=100% src="https://capsule-render.vercel.app/api?type=waving&color=40E0D0&height=120&section=header"/>

# 📅 Sistema - Fatec Itu 📅

<p align="left">
  <a href="./README.en.md">
    <img src="https://img.shields.io/badge/🌍%20Click%20here%20to%20read%20in%20english!%20-purple?style=for-the-badge" alt="Ler em inglês"/>
  </a>
</p>

## ⭐ Repositório Back-End

## 📌 Sobre o projeto

### Este sistema foi desenvolvido para que os eventos da Faculdade Fatec Itu - Dom Amaury Castanho pudessem ter um método de inscrição mais práticos, gerando facilidade tanto para os alunos, pessoas de fora e para os responsáveis pelos eventos. Claramente este sistema também é utilizado pelos responsáveis dos eventos, para gerenciamento, controle e etc. 

### 👥 Este sistema está sendo criado por: Guilherme Francisco Pereira // José Lucas Martins Gomes como desenvolvimento de TCC / Sistema real

### ✨ Fato interessante!! Este é o único sistema desenvolvido por alunos que está implementado e em utilizado pela faculdade, tanto por alunos como professores, coordenadores, e etc!

<img width=100% src="https://capsule-render.vercel.app/api?type=waving&color=40E0D0&height=120&section=footer"/>

## 🖥 Tecnologias Utilizadas
<div align='center'>

!['NestJSLogo'](https://img.shields.io/badge/nestjs-E0234E?style=for-the-badge&logo=nestjs&logoColor=white)
!['TypescriptLogo'](https://img.shields.io/badge/TypeScript-007ACC?style=for-the-badge&logo=typescript&logoColor=white)
<!-- !['PrismaLogo'](https://img.shields.io/badge/Prisma-3982CE?style=for-the-badge&logo=Prisma&logoColor=white)
!['MySQLLogo'](https://img.shields.io/badge/MySQL-4479A1?style=for-the-badge&logo=mysql&logoColor=white)
!['DockerLogo'](https://img.shields.io/badge/docker-257bd6?style=for-the-badge&logo=docker&logoColor=white) -->

</div>

## Versões utilizadas:
    - Nest: 11.0.7
    - Typescript: 5.7.3

## 🙋🏻‍♂ Como me localizar no projeto?

### Todos os arquivos de código fonte do projeto estão em: `./src` e os testes E2E estão em: `./test`

## 🛈 Como o projeto está estruturado

- `./src/app.module.ts`: Módulo raiz que declara/importa os demais módulos, controladores e provedores da aplicação.  
- `./src/main.ts`: Ponto de entrada da aplicação, aqui o Nest é inicializado e configurado.

- `./src/modules:` A pasta modules reúne todos os módulos da aplicação, cada um em seu próprio diretório para manter lógica, controladores e provedores bem organizados e desacoplados, depois todos importados pelo módulo raiz (AppModule)
  - `commom:` Concentramos funcionalidades compartilhadas por vários módulos, é nesse nível que ficam componentes que não pertencem a um domínio específico.
    - `csrf.controller.ts:` Expõe um endpoint para obter o token CSRF do usuário, garantindo que cada chamada realmente venha da aplicação legítima e não de um site mal-intencionado, evitando CSRF.

- `./test/` Diretório dedicado aos testes de ponta a ponta (e2e):  
  - `app.e2e-spec.ts`: Nossos testes e2e para validar endpoints e fluxos principais da API, garante que os cenários funcionem conforme esperado.
  - `jest.e2e-json`: Arquivo de configuração do Jest para executar os testes e2e (definição de extensões de arquivo reconhecidas, ponto de partida para busca de testes, transform, e etc.)   

## ❔ Como rodar o projeto na minha máquina?

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
    
- Ao ter o projeto na sua máquina você deve abrir o site. Para isso siga os passos abaixo:
    - Lembre-se de criar o arquivo .env com base em tudo que contem no arquivo: `.env.example`
    - Abra o terminal e escreva o código abaixo para iniciar o site:
      ```bash
      npm run start:dev
      ```

## 🧪 Como rodar os testes unitários e e2e?

### Testes unitários:

- `npx jest` acompanhado do nome do módulo, exemplo: `users` e o nome do arquivo, por exemplo: `users.service.spec.ts` e sempre respeitando a hierarquia de pastas, se os módulos estiverem dentro de uma pasta modules deve conter isso após o src
  - Ficando desta maneira:
    - `npx jest src/modules/users/users.service.spec.ts --config=jest.config.ts`

### Testes e2e:

- Para rodar os teste e2e você deve apenas escrever:
  - `npm run test:e2e`

##

## 🎉  É isso! Esse é o sistema da Fatec Itu para eventos, caso tenha ficado com alguma dúvida ou deseje complementar algo diretamente comigo você pode estar entrando em contato através do meu LinkedIn:
> Link do meu LinkedIn: <a href="https://www.linkedin.com/in/guilherme-francisco-pereira-4a3867283" target="_blank">https://www.linkedin.com/in/guilherme-francisco-pereira-4a3867283</a>

### 🚀 Obrigado pela atenção e espero que tenha gostado do que tenha visto aqui, que tal agora dar uma olhada nos meus outros repositórios? 👋🏻

#

### ❤️ Créditos:

#### Créditos primários à Fatec itu por ceder seu nome, e utilizar o sistema em seu ambiente!
> <a href="https://fatecitu.cps.sp.gov.br" target="_blank">https://fatecitu.cps.sp.gov.br</a>

#### Créditos dos emojis: 
> <a href="https://emojipedia.org" target="_blank">https://emojipedia.org</a>

- #### Créditos dos badges: 
> <a href="https://shields.io" target="_blank">https://shields.io</a>