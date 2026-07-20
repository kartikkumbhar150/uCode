# Vercel Deployment Guide
To deploy this backend on Vercel:
1. Make sure you have the Vercel CLI installed (`npm i -g vercel`).
2. Run `vercel login`.
3. In the `backend` directory, simply run `vercel` or `vercel --prod`.
4. The provided `vercel.json` maps incoming API requests directly to the Express `index.ts` handler via `@vercel/node`.
5. Ensure to set the required Environment Variables in your Vercel Project Settings: `MONGO_URI`, `JWT_SECRET`, `GOOGLE_CLIENT_ID`, `GROQ_API_KEY`.
