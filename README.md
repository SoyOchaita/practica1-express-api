# Practica 1 — Express API

This project is a **RESTful API** built with **Node.js, Express, and PostgreSQL**.  
It includes **JWT authentication**, user management, follow system, and posts, simulating a simple microblogging platform.

---

## 📌 Features
- User registration and login with JWT authentication
- Create, read, update and delete posts
- Follow/unfollow users
- Protected routes using middleware
- OpenAPI (Swagger) documentation

---

## 📦 Requirements
- Node.js >= 18
- PostgreSQL >= 14
- npm or yarn
- Git
- (Optional) Docker & Docker Compose

---

## ⚙️ Installation (Local)

Clone the repository:
```bash
git clone https://github.com/SoyOchaita/practica1-express-api.git
cd practica1-express-api
```

Install dependencies:
```bash
npm install
```

Set up environment variables:  
Create a `.env` file in the root folder with the following keys:

```env
PORT=3000
DATABASE_URL=postgres://username:password@localhost:5432/your_database
JWT_SECRET=your_jwt_secret
```

---

## 🗄️ Database Migrations

If you are running PostgreSQL locally, run the migrations to create tables:

```bash
npm run migrate
```

Or manually using `psql`:
```bash
psql -U postgres -d your_database -f migrations/init.sql
```

This will create tables for **users, posts, follows**.

---

## ▶️ Running the project

Start the server in development mode:
```bash
npm run dev
```

Start the server in production mode:
```bash
npm start
```

The API will be available at:
```
http://localhost:3000
```

---

## 🐳 Run with Docker

If you prefer to use Docker, follow these steps:

1. Build and start the containers:
```bash
docker-compose up --build
```

2. The API will run at:
```
http://localhost:3000
```

3. PostgreSQL will be available at:
```
localhost:5432
username: postgres
password: postgres
database: practica1
```

4. Run migrations inside the container:
```bash
docker exec -it express_api npm run migrate
```

---

### Example `docker-compose.yml`

```yaml
version: "3.9"
services:
  api:
    build: .
    container_name: express_api
    ports:
      - "3000:3000"
    env_file:
      - .env
    depends_on:
      - db

  db:
    image: postgres:15
    container_name: express_db
    environment:
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: postgres
      POSTGRES_DB: practica1
    ports:
      - "5432:5432"
    volumes:
      - pgdata:/var/lib/postgresql/data

volumes:
  pgdata:
```

---

## 📖 API Documentation (Swagger)

Swagger UI is available at:
```
http://localhost:3000/docs#/
```

Here you can test all endpoints, such as:
- `POST /users/register`
- `POST /users/login`
- `GET /posts/:id`
- `POST /follows/:id`

---

## 🛠️ Example Usage

Register a user:
```bash
curl -X POST http://localhost:3000/users/register   -H "Content-Type: application/json"   -d '{"username": "john", "password": "123456"}'
```

Login and get JWT:
```bash
curl -X POST http://localhost:3000/users/login   -H "Content-Type: application/json"   -d '{"username": "john", "password": "123456"}'
```

Use JWT to access protected routes:
```bash
curl -X GET http://localhost:3000/users/me   -H "Authorization: Bearer <your_token_here>"
```

---

## 📂 Project Structure
```
practica1-express-api/
│── migrations/        # SQL migration files
│── src/
│   ├── controllers/   # Route controllers
│   ├── middleware/    # JWT validation and auth
│   ├── models/        # Database models
│   ├── routes/        # API routes
│   └── index.js       # App entry point
│
│── .env.example       # Example environment variables
│── docker-compose.yml
│── package.json
│── README.md
```

---

## 👨‍💻 Author
Developed by **Alfonso Enrique Ochaita Moreno**  
System Engineering Student · Web Developer
