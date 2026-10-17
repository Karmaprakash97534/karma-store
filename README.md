# Karma Store — Full-stack starter

A React + Vite storefront with an Express API, MongoDB products/orders, shopping cart, COD checkout, and a password-protected admin orders page. Product catalogue and hero now use editorial fashion photography from Unsplash (internet access is required to load those remote images).

## Requirements
- Node.js 20.19+ (recommended for the included Vite version)
- npm
- MongoDB database (local or MongoDB Atlas)

## First-time setup

1. Extract the ZIP and open a terminal in the `karma-store` folder.
2. Install all workspace dependencies:

   ```bash
   npm install
   ```

3. Copy `server/.env.example` to `server/.env`, then set a valid `MONGODB_URI` and a strong unique `ADMIN_PASSWORD`.
4. Copy `client/.env.example` to `client/.env` if you need to change the API URL.
5. Start both frontend and backend:

   ```bash
   npm run dev
   ```

6. Open the Vite URL shown in the terminal (usually `http://localhost:5173`).
   - API health check: `http://localhost:5000/api/v1/health`
   - Admin page: `http://localhost:5173/admin`

## Add demo products

With `server/.env` configured and MongoDB accessible:

```bash
npm run seed
```

The seed script upserts the four demo products by their slug (it updates matching demo products and inserts missing ones). It does not delete the whole products collection. Review the product image URLs before using the demo catalogue in production.

## Useful commands

```bash
npm run dev:client
npm run dev:server
npm run build
npm run lint
```

## Environment and security
- Never commit `.env` files or credentials. `.env.example` files contain placeholders only.
- Rotate any database password or admin password that was previously shared in an archive, screenshot, chat, or repository.
- Admin access currently uses a shared password header. For a public production deployment, replace this with proper user accounts, hashed passwords, sessions or short-lived tokens, rate limiting, audit logs, and HTTPS.
- Configure production CORS to the exact deployed frontend origin.
- Use a dedicated least-privilege database user and backups.
- Add a payment provider only through a server-side integration; the current checkout supports COD only.

For Vercel + Render production deployment, follow [DEPLOYMENT.md](./DEPLOYMENT.md).

## Project layout

```text
client/   React UI, Vite, storefront and admin page
server/   Express API, MongoDB models, product/order routes
```

This is a stronger project foundation, not a claim of security certification or a fully audited production deployment. Test the deployment, secrets, order concurrency, and business rules before accepting real customer orders.
