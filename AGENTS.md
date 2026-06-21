<!-- BEGIN:nextjs-agent-rules -->
# Next.js custom rules

This version has breaking changes — APIs, conventions, and file structure may all differ from typical training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

**Commands**
- `npm run dev` (or `yarn dev`, `pnpm dev`, `bun dev`) – starts the development server on http://localhost:3000.
- `npm run build` – creates a production build.
- `npm run start` – serves the production build.
- `npm run lint` – runs ESLint.

**Vercel function limits**
- API routes `src/app/api/ocr/route.ts`, `src/app/api/evaluate-text/route.ts`, and `src/app/api/improve-text/route.ts` have `maxDuration: 60` seconds configured in `vercel.json`. Agents should avoid long‑running operations when testing these endpoints.

**Testing link**
- After running `npm run dev`, open **http://localhost:3000** in a browser to test the application.

**Project notes**
- Clerk authentication requires a valid `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` (and `CLERK_SECRET_KEY`) in `.env.local`. The default placeholder (`pk_test_REPLACE_ME`) will cause a startup error. Obtain keys from your Clerk dashboard and set them before running `npm run dev`.
- Uses Next.js 16.2.4; consult the docs in `node_modules/next/dist/docs/` for the altered APIs.
- `google-credentials.json` is ignored by git but required for Google GenAI calls – ensure the appropriate environment variables are set before running the app.
