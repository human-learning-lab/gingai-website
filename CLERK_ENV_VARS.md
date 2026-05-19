# GingAI — Clerk Environment Variables

Legg disse inn i Vercel under **Settings → Environment Variables**.
Sett alle til **Production + Preview + Development**.

---

| Name | Value |
|------|-------|
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | `pk_test_d29uZHJvdXMtbWFybW90LTQwLmNsZXJrLmFjY291bnRzLmRldiQ` |
| `CLERK_SECRET_KEY` | `sk_test_fRtAXiv6mg3OZTABiCRuQ1MKOzoXlwUv4VKnSy6FZq` |
| `NEXT_PUBLIC_CLERK_SIGN_IN_URL` | `/sign-in` |
| `NEXT_PUBLIC_CLERK_SIGN_UP_URL` | `/sign-in` |
| `NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL` | `/backbone` |
| `NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL` | `/backbone` |

---

Etter at variablene er lagt inn: klikk **Redeploy** på siste deployment.

Når du/kollega har logget inn og havner på "Access Pending" —
si ifra til Emilie med e-postadressen din så setter hun rollen.
