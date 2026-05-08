# Vaultkey

A JWT-based authentication system built with Node.js and Express.
Vaultkey demonstrates the full authentication flow used in real-world
applications — from securely hashing passwords at registration, to
issuing signed tokens at login, to verifying identity on protected routes.
Built as a clean, dependency-light backend auth module you can drop into
any Node.js project.

## Install

git clone https://github.com/simonkimeu/vaultkey.git
cd vaultkey
npm install

## Run

node src/index.js
Server starts on http://localhost:3001

## Endpoints

POST /register
Creates a new user. Password is hashed with bcrypt before storage.
Body:    {"username": "simon", "password": "secret123"}
Success: {"message": "User created", "userId": 1778266303143}
Error:   {"error": "User already exists"}

POST /login
Validates credentials and returns a signed JWT valid for 1 hour.
Body:    {"username": "simon", "password": "secret123"}
Success: {"token": "<jwt_token>"}
Error:   {"error": "Invalid credentials"}

GET /profile (protected)
Returns the authenticated user's profile.
Requires Authorization header with Bearer token.
Header:  Authorization: Bearer <jwt_token>
Success: {"message": "Welcome simon", "user": {...}}
Error:   {"error": "Invalid or expired token"}

## Test

# Step 1 — Register
curl -s -X POST http://localhost:3001/register \
  -H "Content-Type: application/json" \
    -d '{"username":"simon","password":"secret123"}'

    # Step 2 — Login and grab token
    curl -s -X POST http://localhost:3001/login \
      -H "Content-Type: application/json" \
        -d '{"username":"simon","password":"secret123"}'

        # Step 3 — Access protected route
        curl -s http://localhost:3001/profile \
          -H "Authorization: Bearer <paste_token_here>"

          ## How It Works

          1. User registers — password is hashed using bcrypt (10 salt rounds)
          2. User logs in — bcrypt compares submitted password to stored hash
          3. On success, server signs a JWT with user id and username
          4. JWT is returned to client and stored for subsequent requests
          5. Protected routes run the token through middleware verification
          6. If token is valid, request proceeds; if not, 401 is returned

          ## Project Structure

          src/index.js      — Express server, route definitions
          src/auth.js       — Register and login logic
          src/middleware.js — JWT verification middleware
          src/db.js         — In-memory user store

          ## Tech Stack
          - Node.js
          - Express
          - jsonwebtoken
          - bcryptjs

          ## Author
          Simon Kimeu — github.com/simonkimeu