<img width=100% src="https://capsule-render.vercel.app/api?type=waving&color=40E0D0&height=120&section=header"/>

# 📅 System - Fatec Itu 📅

<p align="left">
<a href="./README.md">
<img src="https://img.shields.io/badge/🌍%20Clique%20aqui%20para%20ler%20em%20português!%20-purple?style=for-the-badge" alt="Read in Portuguese"/>
</a>
</p>

## ⭐ Back-End Repository

## 📌 About the project

### This system was developed so that events at Fatec Itu - Dom Amaury College can be streamed. Castanho could have a more practical registration method, making it easier for students, outsiders, and event organizers. Clearly, this system is also used by event organizers for management, monitoring, etc.

### 👥 This system is being created by: Guilherme Francisco Pereira // José Lucas Martins Gomes as a final project development / Real system

### ✨ Interesting fact!! This is the only student-developed system that is implemented and used by the college, both by students and professors, coordinators, and more!

<img width=100% src="https://capsule-render.vercel.app/api?type=waving&color=40E0D0&height=120&section=footer"/>

## 🖥 Technologies Used
<div align='center'>

!['NestJSLogo'](https://img.shields.io/badge/nestjs-E0234E?style=for-the-badge&logo=nestjs&logoColor=white)
!['TypescriptLogo'](https://img.shields.io/badge/TypeScript-007ACC?style=for-the-badge&logo=typescript&logoColor=white)
<!-- !['PrismaLogo'](https://img.shields.io/badge/Prisma-3982CE?style=for-the-badge&logo=Prisma&logoColor=white)
!['MySQLLogo'](https://img.shields.io/badge/MySQL-4479A1?style=for-the-badge&logo=mysql&logoColor=white)
!['DockerLogo'](https://img.shields.io/badge/docker-257bd6?style=for-the-badge&logo=docker&logoColor=white) -->

</div>

## Versions used: 
- Nest: 11.0.7 
- Typescript: 5.7.3

## 🙋🏻‍♂ How can I locate myself in the project?

### All project source code files are in: `./src` and E2E tests are in: `./test`

## 🛈 How the project is structured

- `./src/app.module.ts`: Root module that declares/imports the application's other modules, controllers, and providers.
- `./src/main.ts`: Application entry point, where Nest is initialized and configured.

- `./src/modules:` The modules folder brings together all the application's modules, each in its own directory to keep logic, controllers, and providers well-organized and decoupled, all then imported by the root module (AppModule).
    - `common:` We concentrate functionality shared by multiple modules; this is where components that don't belong to a specific domain are stored.
        - `csrf.controller.ts:` Exposes an endpoint to obtain the user's CSRF token, ensuring that each call actually comes from the legitimate application and not a malicious website, thus preventing CSRF.

- `./test/` Directory dedicated to end-to-end (e2e) tests:
- `app.e2e-spec.ts`: Our e2e tests to validate endpoints and main API flows, ensuring that scenarios work as expected. - `jest.e2e-json`: Jest configuration file for running e2e tests (defining recognized file extensions, starting point for test searches, transforms, etc.)

## ❔ How do I run the project on my machine?

- First of all, you need to have Git installed on your computer. Git is a tool that allows you to clone and manage code repositories.
- Windows: Download Git <a href="https://git-scm.com/download/win" target="_blank">here</a> and follow the installation instructions. - macOS: You can install Git <a href="https://git-scm.com/download/mac" target="_blank">here</a> or using Homebrew with the brew install git command:
    ```bash
    brew install git
    ```

- Linux: Use your distribution's package manager, for example, for Debian/Ubuntu:
    ```bash
    sudo apt install git
    ```

- Open a terminal (on Windows, you can use Git Bash, which is installed along with Git).

- Navigate to the directory where you want to store the project.

- Run the command to clone the repository:
    ```bash
    git clone https://github.com/GuilhermeFranciscoPereira/Eventos_Fatec_Itu-Back-End.git
    ```

- After cloning the repository, navigate to the project folder.
    ```bash
    cd Eventos_Fatec_Itu-Back-End.git
    ```

- Now you can open the project files with your preferred text editor or IDE. Example:
    ```bash
    code .
    ```

- 🚨 Don't forget that to avoid errors in the code when cloning it, you must run the command below: 🚨
    ```bash
    npm i
    ```

- Once you have the project on your machine, open the website. To do this, follow the steps below:
    - Remember to create the .env file based on everything contained in the file: `.env.example`
    - Open the terminal and write the code below to start the website:
        ```bash
        npm run start:dev
        ```

## 🧪 How to run unit and e2e tests?

### Unit tests:

- `npx jest` followed by the module name, for example: `users` and the file name, for example: `users.service.spec.ts` and always respecting the folder hierarchy. If the modules are inside a modules folder, it must contain this after the src
    - It should look like this:
        - `npx jest src/modules/users/users.service.spec.ts --config=jest.config.ts`

### E2E tests:
- To run the e2E tests, just type:
    - `npm run test:e2e`

##

## 🎉 That's it! This is Fatec Itu's system for events. If you have any questions, If you have any questions or would like to ask me anything directly, you can contact me through my LinkedIn:
> My LinkedIn link: <a href="https://www.linkedin.com/in/guilherme-francisco-pereira-4a3867283" target="_blank">https://www.linkedin.com/in/guilherme-francisco-pereira-4a3867283</a>

### 🚀 Thank you for your attention and I hope you enjoyed what you saw here. How about checking out my other repositories now? 👋🏻

#

### ❤️ Credits:

#### Primary credits to Fatec Itu for providing its name and using the system in its environment! 
> <a href="https://fatecitu.cps.sp.gov.br" target="_blank">https://fatecitu.cps.sp.gov.br</a>

#### Emoji credits:
> <a href="https://emojipedia.org" target="_blank">https://emojipedia.org</a>

- #### Badge credits:
> <a href="https://shields.io" target="_blank">https://shields.io</a>