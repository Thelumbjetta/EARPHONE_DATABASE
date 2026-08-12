/**
 * auth.ts  (project root — same level as package.json)
 * =============================================================
 * NextAuth v5 (Auth.js) — Central Configuration
 * =============================================================
 *
 * AUTH STRATEGY: Email Magic-Link (Passwordless)
 *   1. User enters their email on /login.
 *   2. Auth.js generates a signed token and emails a magic link.
 *   3. User clicks the link → token is verified → session created.
 *   4. Sessions are stored in the PostgreSQL `sessions` table
 *      (database strategy, not JWT).
 *
 * WHY PASSWORDLESS?
 *   - No passwords to hash, store, or breach.
 *   - A compromised email = user's existing security layer.
 *   - Industry-standard for modern community platforms.
 *
 * DATABASE ADAPTER (@auth/pg-adapter):
 *   Required by the Email provider to store:
 *     - verification_tokens: time-limited magic-link tokens
 *     - sessions: active user sessions
 *     - accounts: provider account links
 *   All three tables are created in migrations/015_create_auth_tables.sql.
 * =============================================================
 */

import NextAuth from 'next-auth';
import Email from 'next-auth/providers/email';
import PostgresAdapter from '@auth/pg-adapter';
import pool from '@/lib/db';
import nodemailer from 'nodemailer';

// ── TYPE EXTENSIONS ────────────────────────────────────────────────────────────
// Extend the default Session type to include the user's database id.
declare module 'next-auth' {
  interface Session {
    user: {
      id: string;
      name?: string | null;
      email?: string | null;
      image?: string | null;
    };
  }
}

// ── NODEMAILER TRANSPORT ────────────────────────────────────────────────────────
//
// Nodemailer sends the magic-link emails.
// Configuration is driven entirely by environment variables so
// no secrets are hardcoded here.
//
// Supported configurations (set in .env.local):
//   EMAIL_SERVER=smtps://user:pass@smtp.example.com:465
//   EMAIL_FROM=noreply@yourdomain.com
//
// For Resend: EMAIL_SERVER=smtps://resend:YOUR_RESEND_KEY@smtp.resend.com:465
//   (uses smtps:// for direct SSL on port 465 — NOT smtp:// which is STARTTLS)
// For Gmail:  EMAIL_SERVER=smtp://you@gmail.com:APP_PASSWORD@smtp.gmail.com:587
// ──────────────────────────────────────────────────────────────────────────────
const transport = nodemailer.createTransport(
  process.env.EMAIL_SERVER || 'smtp://localhost:1025'
);

// ── NEXTAUTH CONFIGURATION ─────────────────────────────────────────────────────
export const { handlers, auth, signIn, signOut } = NextAuth({

  // ── Database Adapter ─────────────────────────────────────────────────────────
  // @auth/pg-adapter uses the existing pg Pool to read/write:
  //   users, accounts, sessions, verification_tokens
  // The `as any` cast resolves a minor type mismatch between
  // pg Pool generics and the adapter's expected interface.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  adapter: PostgresAdapter(pool as any),

  // ── Providers ───────────────────────────────────────────────────────────────
  providers: [

    // ── Email (Magic-Link) Provider ──────────────────────────────────────────
    //
    // When a user submits their email on /login:
    //   1. Auth.js generates a unique signed token.
    //   2. It stores the token in `verification_tokens`.
    //   3. It calls `sendVerificationRequest` to email the link.
    //   4. User clicks the link → /api/auth/callback/email?token=...
    //   5. Auth.js verifies the token, creates/finds the user, creates session.
    // ──────────────────────────────────────────────────────────────────────────
    Email({
      server: process.env.EMAIL_SERVER || 'smtp://localhost:1025',
      from: process.env.EMAIL_FROM || 'audiothread <noreply@audiothread.app>',

      // Token validity window — 24 hours (in seconds)
      maxAge: 24 * 60 * 60,

      // Custom email template for the magic-link message
      async sendVerificationRequest({ identifier: email, url, provider }) {
        const { host } = new URL(url);

        const info = await transport.sendMail({
          to: email,
          from: provider.from,
          subject: `Sign in to audiothread`,
          text: `Sign in to audiothread\n\nClick the link below to sign in. This link expires in 24 hours.\n\n${url}\n\nIf you did not request this email, you can safely ignore it.\n`,
          html: `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Sign in to audiothread</title>
</head>
<body style="margin:0;padding:0;background:#f4f6f8;font-family:'Inter',system-ui,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f6f8;padding:40px 20px;">
    <tr>
      <td align="center">
        <table width="480" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:20px;border:1px solid #eaefec;overflow:hidden;">
          <!-- Header -->
          <tr>
            <td style="padding:32px 40px 24px;border-bottom:1px solid #eaefec;">
              <table cellpadding="0" cellspacing="0">
                <tr>
                  <td style="background:#10b981;border-radius:50%;width:36px;height:36px;text-align:center;vertical-align:middle;padding:0;">
                    <span style="color:white;font-size:20px;font-weight:900;line-height:36px;">&#9654;</span>
                  </td>
                  <td style="padding-left:10px;">
                    <span style="font-size:20px;font-weight:800;color:#111827;letter-spacing:-0.5px;">audio<span style="color:#10b981;">thread</span></span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <!-- Body -->
          <tr>
            <td style="padding:32px 40px;">
              <p style="margin:0 0 8px;font-size:22px;font-weight:800;color:#111827;line-height:1.3;">Your sign-in link</p>
              <p style="margin:0 0 28px;font-size:14px;color:#6b7280;line-height:1.6;">
                Click the button below to sign in to <strong style="color:#111827;">audiothread</strong>. 
                This link expires in <strong>24 hours</strong> and can only be used once.
              </p>
              <table cellpadding="0" cellspacing="0">
                <tr>
                  <td style="border-radius:12px;background:#10b981;">
                    <a href="${url}" style="display:inline-block;padding:14px 32px;color:#ffffff;font-size:14px;font-weight:700;text-decoration:none;letter-spacing:0.2px;">
                      Sign in to audiothread &rarr;
                    </a>
                  </td>
                </tr>
              </table>
              <p style="margin:24px 0 0;font-size:12px;color:#9ca3af;line-height:1.6;">
                Or copy this URL into your browser:<br/>
                <span style="color:#10b981;word-break:break-all;">${url}</span>
              </p>
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td style="padding:20px 40px;border-top:1px solid #eaefec;">
              <p style="margin:0;font-size:11px;color:#9ca3af;line-height:1.6;">
                Signing in to <strong>${host}</strong> &bull; If you did not request this email, you can safely ignore it — no account has been created.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`,
        });

        // Log the preview URL when using Ethereal/local test transport
        if (process.env.NODE_ENV !== 'production') {
          console.log('[auth] Magic-link email sent to:', email);
          const previewUrl = nodemailer.getTestMessageUrl(info);
          if (previewUrl) console.log('[auth] Preview URL:', previewUrl);
        }
      },
    }),
  ],

  // ── Session ──────────────────────────────────────────────────────────────────
  //
  // strategy: 'database'
  //   Sessions are stored as rows in the `sessions` PostgreSQL table.
  //   The user's browser holds a session token cookie that maps to a row.
  //   This is REQUIRED by the Email provider (JWT strategy is incompatible
  //   with the pg-adapter's email flow).
  // ─────────────────────────────────────────────────────────────────────────────
  session: {
    strategy: 'database',
    maxAge: 30 * 24 * 60 * 60, // 30 days
    updateAge: 24 * 60 * 60,   // Refresh session every 24 hours
  },

  // ── Pages ────────────────────────────────────────────────────────────────────
  // Point all auth flows to our custom /login page.
  // ─────────────────────────────────────────────────────────────────────────────
  pages: {
    signIn: '/login',
    verifyRequest: '/login?verify=1', // After email sent → show "check inbox" state
    error: '/login?error=1',
  },

  // ── Callbacks ────────────────────────────────────────────────────────────────
  callbacks: {

    // Embed the user's database `id` into every session object.
    // session.user.id is the numeric PG user row id (as string).
    async session({ session, user }) {
      if (user && session.user) {
        session.user.id = user.id;
      }
      return session;
    },
  },
});
