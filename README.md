# E-Store

A small e-commerce storefront with email OTP verification.

- **Backend** (`server/index.js`): Express server with two existing endpoints:
  - `POST /send-otp` — sends a 6-digit OTP to the given email (Nodemailer + Gmail).
  - `POST /verify-otp` — verifies the OTP and returns a JWT (valid 1 hour).
- **Frontend** (`public/`): customer-facing store, served by the same Express server.
  - Product grid with search.
  - **Add to Cart** on every product, cart drawer with quantity +/−, remove and total.
  - Cart is saved in the browser (localStorage), so it survives refresh.
  - Checkout asks for **email verification** (OTP) first; after verifying, the order is placed and a JWT is stored for the session.

## Run locally

```bash
npm install
npm start
```

Then open http://localhost:3000

## Deploy

Any Node host works (Render, Railway, ...). Start command: `npm start`.
Set `PORT` via the host; the server reads `process.env.PORT`.

## Note

`server/index.js` contains Gmail credentials and a JWT secret in code. Move them to
environment variables before using this for anything real.
