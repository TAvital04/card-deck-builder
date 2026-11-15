# Card Deck Builder — frontend / Round 1

Only the requested UI scope is present: React 18 + TypeScript + Vite, `Navbar`, `AuthModal`, `services/api.ts`, and a minimal design system in `index.css`. The page intentionally has no landing hero or deck-calculator UI.

### Run from VS Code (Mac)

```bash
cd frontend
npm install
npm run dev
```

Open http://localhost:5173. The Vite proxy passes requests with `/api` to `http://127.0.0.1:5000` (see `vite.config.ts`). `npm run build` is the Round 1 verification command.

The backend **must separately run an Express server at port 5000 and mount `backend/src/routes/authRoutes.js` at `/api/auth`**. The supplied ZIP has controller and route modules but no server entry point, no Express dependency, and no `npm start` script. **Frontend changes alone cannot start the backend.** Ask the backend teammate to provide the server and MongoDB connection. Do not treat the frontend dev server as the API server.

If the backend is hosted elsewhere, create `frontend/.env.local` containing `VITE_API_BASE_URL=https://your-backend.example/api`. In that mode, the backend must configure CORS for the frontend origin. Otherwise leave the default `/api` and use the Vite proxy.

### Verified API contract from the supplied backend

| UI operation | HTTP | Payload |
| --- | --- | --- |
| Register | POST `/api/auth/register` | `{name, email, password}` |
| Verify email | POST `/api/auth/verify-email` | `{token}` |
| Login | POST `/api/auth/login` | `{email, password}` |
| Forgot password | POST `/api/auth/forgot-password` | `{email}` |
| Reset password | POST `/api/auth/reset-password` | `{token, password}` |
| Resume session | GET `/api/auth/me` | `Authorization: Bearer <JWT>` |

The backend reports `{success, message, token?, user?, verificationToken?, resetToken?}`. The frontend shows backend error messages, validates registration email in both JavaScript and HTML5 `pattern`, and attaches the stored JWT to API calls. Saved JWTs are verified via `/auth/me` on reload.

### Email and reset flow limitations

The supplied backend **does not send verification or reset emails**. For local development, its register/forgot endpoints currently return raw tokens in the JSON response. The frontend automatically fills these fields **only in Vite development mode**, with a clear disclaimer that no email was sent. Do not use that flow in production; the backend must send tokens through a secure email flow and stop exposing them in API responses.

The supplied backend **does not implement** `/api/auth/resend-verification`; the `Resend code` label is displayed but disabled until the backend supports it, rather than sending a request to a nonexistent endpoint.

The supplied backend has important **backend-owned security work** remaining: production JWT secrets, unverified-user authorization, and password-reset token expiry need review. In particular `User.js` defines `resetPasswordExpire` while `authController.js` uses `resetPasswordExpires`; token expiry is currently inconsistent. None of these backend files were edited by this frontend-only change.

### Design requirements

- Inter body/UI, JetBrains Mono small utility labels.
- Neutral grayscale palette, defined CSS variables, subtle borders.
- Hover, active, focus, dialog motion, `prefers-reduced-motion` support.
- Minimal centered authentication dialog and navbar only.
