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

### 👥 This system is being created by: Guilherme Francisco Pereira as a final project development / Real system

### ✨ Interesting fact!! This is the only student-developed system that is implemented and used by the college, both by students and professors, coordinators, and more!

<img width=100% src="https://capsule-render.vercel.app/api?type=waving&color=40E0D0&height=120&section=footer"/>

##

<img width=100% src="https://capsule-render.vercel.app/api?type=waving&height=120&section=header"/>

## 🛎️ Updates to this commit

### `./src/guards/roles.guard.ts:` Fixed roles.guard.ts to actually block routes that users who do not have a certain hierarchy level cannot access.

<img width=100% src="https://capsule-render.vercel.app/api?type=waving&height=120&section=footer"/>

##

## 🖥 Technologies Used
<div align='center'>

!['NestJSLogo'](https://img.shields.io/badge/nestjs-E0234E?style=for-the-badge&logo=nestjs&logoColor=white)
!['TypescriptLogo'](https://img.shields.io/badge/TypeScript-007ACC?style=for-the-badge&logo=typescript&logoColor=white)
!['PrismaLogo'](https://img.shields.io/badge/Prisma-3982CE?style=for-the-badge&logo=Prisma&logoColor=white)
!['MySQLLogo'](https://img.shields.io/badge/MySQL-4479A1?style=for-the-badge&logo=mysql&logoColor=white)
!['DockerLogo'](https://img.shields.io/badge/docker-257bd6?style=for-the-badge&logo=docker&logoColor=white)

</div>

## Versions used: 
    - Nest: 11.0.7 
    - Typescript: 5.7.3
    - Prisma: 6.12.0
    - MySQL: 8.0.42
    - Docker: 28.3.2

## 🙋🏻‍♂ How can I locate myself in the project?

### All project source code files are in: `./src` and E2E tests are in: `./test`

## 🛈 How the project is structured

- `./prisma:` Prisma allows you to interact with the database securely and efficiently. It also handles schema management and facilitates the creation and execution of migrations, in addition to offering an intuitive API for queries and data manipulation.
    - `schema.prisma:` This is the central file where we define the Prisma Client's data models, relationships, and generators.

- `./src/app.module.ts`: Root module that declares/imports the application's other modules, controllers, and providers.
- `./src/main.ts`: Application entry point, where Nest is initialized and configured.

- `./src/assets:` directory to organize additional static resources.
    - `readme:` Folder that will store our photos for use in the documentation ( README )

- `./src/decorators:` Folder for custom decorators.
    - `roles.decorator.ts:` Defines a decorator to indicate which user profiles are allowed to access each endpoint.

- `./src/guards:` Folder for authentication and authorization guards.
    - `jwt-auth.guard.ts:` Ensures that only requests authenticated with a valid JWT token are accepted and populates user data in the request.
    - `roles.guard.ts:` Controls access based on the user profile, allowing unrestricted endpoints and blocking them when the profile does not match the permitted ones.

- `./src/modules:` The modules folder contains all the application modules, each in its own directory to keep logic, controllers, and providers well-organized and decoupled, all then imported by the root module (AppModule).
    - `auth:` Module dedicated to the entire user authentication and authorization flow.
        - `dto:` Folder containing Data Transfer Objects that define the input and output format of authentication requests. In short, it's our "Typing." - `auth.controller.ts:` Exposes the endpoints for me, register, logout, request-login, login, request-reset-password, and reset-password, manages access cookies, refresh, and 2FA.
        - `auth.controller.spec.ts:` Covers controller integration tests, validating scenarios for valid and expired tokens, registration, logout, login with 2FA, and password reset.
        - `auth.service.ts:` Encapsulates all authentication business logic—user registration with password hashing, access token generation and verification, refresh and 2FA, sending emails, and clearing expired tokens.
        - `auth.service.spec.ts:` Tests the authentication service flows, ensuring correct behavior in cases of conflict, invalid credentials, token generation, revocation, and renewal of refresh tokens.
        - `auth.module.ts:` Configures the authentication module, imports PrismaModule, ConfigModule, JwtModule with RSA keys loaded from environment variables, and registers AuthService, JwtStrategy, and EmailService
        - `jwt.strategy.ts:` Extracts the JWT from the access cookie, validates its signature and expiration using the public key, and provides user data (ID, email, profile) to the guards

    - `common:` We concentrate functionality shared by multiple modules; this is where components that don't belong to a specific domain are stored.
        - `csrf.controller.ts:` Exposes an endpoint to obtain the user's CSRF token, ensuring that each call actually comes from the legitimate application and not a malicious website, thus preventing CSRF.
    
    - `prisma:` Bundles the PrismaModule (prisma.module.ts) and PrismaService (prisma.service.ts), centralizing Prisma integration in NestJS.
        - `prisma.module.ts`: Defines and globally exports the Prisma module in NestJS, registering the PrismaService as a provider to allow injection into any part of the application.
        - `prisma.service.ts`: Extends PrismaClient, automatically managing the database connection during initialization and disconnection during the module lifecycle.
    - `users:` Module responsible for all user CRUD operations.
        - `dto:` Folder with Data Transfer Objects that define the input and output format of user requests. In short, it's our "Typing".
        - `users.controller.ts`: Exposes the get, post, patch, and delete endpoints for the user CRUD.
        - `users.controller.spec.ts`: Controller integration tests, ensuring that each route correctly invokes the UsersService.
        `users.service.ts`: Business logic for the users module, handling requests that arrive on the controller routes, searching for all users, registering, updating, and deleting them.
        - `users.service.spec.ts`: Unit tests for the UsersService, covering success and error scenarios for each method. - `users.module.ts:` Configures the UsersModule, importing PrismaModule and ConfigModule, and registering UsersService and UsersController.
        - `./src/services:` Brings together injectable classes that encapsulate business logic, utilities, and external integrations.
          
- `./src/services`: Brings together injectable classes that encapsulate business logic, utilities, and external integrations.
    - `email.service.ts:` We have the configurations for sending emails and the send method that we will actually use to send emails.

- `./Dockerfile:` Defines how the application will be packaged into a Docker image.

- `./dockerignore:` Prevents unnecessary files (node_modules, build, etc.) from being included in the image.

- `./docker-compose.yml:` Orchestrates services (Nest app, MySQL database) in a single command, taking care of networking, volumes, and environment variables.

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

##

## 🐳 Docker Commands

### After the 3 files, we generate the Docker image and run it:
``` bash
docker-compose up --build -d
```

### This will:
- Start the MySQL container (db)
- Launch Nest (app)

### Check that the container is actually up and has the port mapped

```bash
docker-compose ps
```

### Open the port that appears, for example:

```bash
http://localhost:xxxx
```

### To restart the backend when changing the code:

```bash
docker-compose restart backend_events-fatec-itu
```

### To restart the database when changing the code:

```bash
docker-compose restart db_events-fatec-itu
```

### To restart everything at once:

```bash
docker-compose restart
```

### Stop only the db

```bash
docker-compose stop db_events-fatec-itu
```

### Stop only the backend

```bash
docker-compose stop backend_events-fatec-itu
```

### If you want to remove the container (in addition to stopping it), use rm:

```bash
docker-compose rm db
```

```bash
docker-compose rm backend
```
### When you want to stop everything at once:

```bash
docker-compose down -v
```

### If you want the 'hot reload' to always update with changes, you can change the `docker-compose.yml` and add:

```bash 
volumes: 
- ./:/app 
- /app/node_modules 
command: npm run start:dev
```

##

## 🧪 How to run unit and e2e tests?

### Unit tests:

- You have two options: run all unit tests at once or one at a time.

- All: `npm run test`

- Each: `npx jest` followed by the module name, for example: `users` and the file name, for example: `users.service.spec.ts` and always respecting the folder hierarchy. If the modules are inside a modules folder, it must contain this after the src
    - It should look like this:
        - `npx jest src/modules/users/users.service.spec.ts --config=jest.config.ts`

### E2E tests:
- To run the e2E tests, just type:
    - `npm run test:e2e`

##

## ⚠️ Important information about the project ⚠️

### 📝 All project commits have a detailed readme detailing what was done in that commit, as shown in the example image below. So if you want to see the code creation process, scroll through the commits and see the information! Example:

##
![Example of the project creation process in the readme](./src/assets/readme/example_howToReadTheCommits.jpg)
##

### ❔ How to do this?

### 👇🏻 To see the creation process and what was done in each commit, follow these steps:

##

### 1 - In this same tab you're in, scroll up until you find the circled spot in the photo below below the green button and then click on it.
![Step 1 - How to see the project creation process](./src/assets/readme/firstStep_howToReadTheCommits.png)

##

### 2 - On the right side of the commits, you'll find a <> symbol, as circled in the photo below. Click on this symbol and you'll find the code at that time and the detailed readme for that moment! ![Step 2 - How to view the project creation process](./src/assets/readme/secondStep_howToReadTheCommits.png)

##

### 3 - After finding everything you need, if you want to return to the current commit, click where the image below is circled:
![Step 3 - How to view the project creation process](./src/assets/readme/thirdStep_howToReadTheCommits.png)

##

### 4 - Then click on main (where it is circled in the image below) and you will return to the last commit made!
![Step 4 - How to view the project creation process](./src/assets/readme/fourthStep_howToReadTheCommits.png)

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