# Vaultkey

JWT authentication system built with Node.js and Express. Register, login, protected routes — the full stateless auth flow.

The server signs a token at login using a secret key. The client stores it and sends it with every protected request. The server verifies the signature mathematically — nothing stored server-side after login.

## Setup

```bash
git clone https://github.com/simonkimeu/vaultkey.git
cd vaultkey
npm install
cp .env.example .env
```

Edit `.env` and set your `JWT_SECRET`, then:

```bash
node src/index.js
```

Server starts on `http://localhost:3001`

## Endpoints

`POST /register` — creates a new user, password hashed with bcrypt

```json
{ "username": "simon", "password": "secret123" }
```

`POST /login` — validates credentials, returns signed JWT valid for 1 hour

```json
{ "token": "<jwt_token>" }
```

`GET /profile` — protected route, requires Bearer token

```
Authorization: Bearer <jwt_token>
```

## Test with curl

```bash
# Register
curl -s -X POST http://localhost:3001/register \
  -H "Content-Type: application/json" \
  -d '{"username":"simon","password":"secret123"}'

# Login
curl -s -X POST http://localhost:3001/login \
  -H "Content-Type: application/json" \
  -d '{"username":"simon","password":"secret123"}'

# Access protected route
curl -s http://localhost:3001/profile \
  -H "Authorization: Bearer <paste_token_here>"
```

## How it works

1. Registration hashes the password using bcrypt (10 salt rounds)
2. Login compares submitted password against stored hash
3. On success, server signs a JWT with user id and username
4. Client stores the token and sends it on protected requests
5. Middleware verifies the signature — valid token proceeds, invalid returns 401

## Project structure

```
src/index.js      — server and route definitions
src/auth.js       — register and login handlers
src/middleware.js — JWT verification
src/db.js         — in-memory user store
```

## Stack

Node.js · Express · jsonwebtoken · bcryptjs · dotenv
