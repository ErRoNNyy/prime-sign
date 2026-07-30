# PrimeSign (DocuSign-style envelope clone)

Document workflow platform: create an **envelope**, upload a PDF, add recipients (contacts or email invites), place **Signature** and **Approve** fields, send invitations, verify recipients with **email OTP**, stamp the PDF, and keep an **audit trail**.

## Stack

- Next.js 16 (App Router) + TypeScript + Bun
- Tailwind CSS
- Supabase (Auth, Postgres, Storage)
- Zod + React Hook Form patterns (server actions + Zod)
- react-pdf + pdf-lib
- Gmail SMTP via Nodemailer (invites + OTP)

## Setup

1. Copy env file and fill values:

```bash
cp .env.example .env.local
```

2. Create a Supabase project. In the SQL editor, run [`supabase/migrations/001_initial.sql`](supabase/migrations/001_initial.sql).

3. Enable Gmail SMTP:
   - Turn on 2-Step Verification on your Google account
   - Create an [App Password](https://myaccount.google.com/apppasswords)
   - Set in `.env.local`: `SMTP_HOST=smtp.gmail.com`, `SMTP_PORT=587`, `SMTP_USER=your@gmail.com`, `SMTP_PASS=app-password`, `EMAIL_FROM=PrimeSign <your@gmail.com>`

4. Install and run:

```bash
bun install
bun run dev
```

Open [http://localhost:3000](http://localhost:3000).

Emails are sent through your Gmail account to real recipient inboxes (invite link + OTP).

## Core flow

1. Sign up / log in
2. **New envelope** → upload PDF
3. **Prepare** → recipients (from contacts or invite by email) → place fields → **Send**
4. Recipient opens `/sign/[token]`, receives OTP by email, verifies, signs/approves
5. Next recipient is notified (sequential `routing_order`)
6. Envelope **completed**; sender can download the stamped PDF and view the audit trail

## Environment

| Variable | Purpose |
|----------|---------|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anon key |
| `SUPABASE_SERVICE_ROLE_KEY` | Server-only admin for signing/OTP |
| `SMTP_HOST` | `smtp.gmail.com` |
| `SMTP_PORT` | `587` |
| `SMTP_USER` | Your Gmail address |
| `SMTP_PASS` | Gmail App Password (16 chars) |
| `EMAIL_FROM` | Must use the same Gmail, e.g. `PrimeSign <you@gmail.com>` |
| `OTP_PEPPER` | Secret for hashing OTP / access tokens |
| `NEXT_PUBLIC_APP_URL` | Public app URL (invite links) |
