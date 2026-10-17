# Karma Store deployment guide

## 1. Deploy the API (Render)

1. Push this project to a GitHub repository you control.
2. In Render, choose **New > Blueprint** and select the repository. Render reads `render.yaml`.
3. Set these environment variables in the Render service:
   - `MONGODB_URI`: MongoDB Atlas connection string for your database. Create a database user with only the permissions needed for this app and allow the Render service to connect in Atlas Network Access.
   - `CLIENT_URL`: the exact Vercel storefront origin, e.g. `https://karma-store-8u29.vercel.app` (no trailing slash).
   - `ADMIN_PASSWORD`: a long, unique password. Do not reuse a password from a chat, screenshot, or committed file.
4. Deploy and wait for a successful health check at `https://YOUR-API.onrender.com/api/v1/health`. A healthy response includes `success: true`; `database` should be `connected`.
5. Optional: seed the demo catalogue locally after setting `server/.env`, using `npm run seed`. Review demo names, prices, stock and image URLs before production use.

## 2. Deploy the React storefront (Vercel)

1. Import the GitHub repository into Vercel.
2. Set **Root Directory** to `client`.
3. Framework preset: **Vite**. Build command: `npm run build`. Output directory: `dist`. Install command: `npm install`.
4. Add the environment variable `VITE_API_URL` with the API origin from Render, for example `https://YOUR-API.onrender.com` (no `/api/v1` suffix and no trailing slash).
5. Redeploy after adding/changing environment variables. The client now uses `localhost:5000` only in Vite development mode, not as the production fallback.

## 3. Local development (Windows PowerShell)

```powershell
# From the repository root
npm install
Copy-Item server/.env.example server/.env
Copy-Item client/.env.example client/.env
# Edit server/.env and enter a valid MONGODB_URI and a unique ADMIN_PASSWORD
npm run seed
npm run dev
```

Open `http://localhost:5173`. Check API health at `http://localhost:5000/api/v1/health`. If `npm run seed` fails, first verify MongoDB Atlas credentials and network access.

## Important

- Never commit `.env` files or paste real database credentials into public issues or chat. If a credential was exposed, rotate it.
- Product photos currently use Unsplash-hosted fashion photography, so internet access is required to display them. These are editorial/demo photos, not proof of the exact physical item for sale. Use your own licensed product photos for the actual catalogue.
- Current checkout is Cash on Delivery only. Do not advertise online payments until a server-side payment provider and verified payment webhooks are implemented.
- The admin page uses a shared password mechanism. Before a public launch, replace it with proper accounts, hashed credentials, short-lived sessions/tokens, rate limiting, and audit logging.
- A successful frontend build does not prove that MongoDB, CORS, product images, checkout, or deployed environment variables work. Test the live API and a complete test order before launch.
