/**
 * auth.ts  (project root — same level as package.json)
 * =============================================================
 * NextAuth v5 (Auth.js) — Central Configuration
 * =============================================================
 *
 * WHAT IS THIS FILE?
 *   This is the "brain" of your entire authentication system.
 *   Every login attempt, every session check, every user
 *   registration flows through logic defined here.
 *
 * HOW NEXTAUTH WORKS (big picture for beginners):
 *   1. A user fills in their email + password on a login form.
 *   2. Their browser sends that data to a special URL:
 *      POST /api/auth/signin
 *   3. NextAuth intercepts this request and calls the
 *      `authorize()` function we define below.
 *   4. `authorize()` checks the database and returns either:
 *      - A user object (success → session is created)
 *      - null (failure → NextAuth shows "Invalid credentials")
 *   5. NextAuth creates a signed JWT (JSON Web Token) and stores
 *      it in a secure, HttpOnly browser cookie.
 *   6. On every future page load, Next.js reads this cookie to
 *      know who is logged in — without hitting the database again.
 *
 * WHY THIS FILE LIVES AT THE ROOT:
 *   NextAuth v5 exports helper functions (auth, signIn, signOut)
 *   that you import in API routes, Server Components, and
 *   middleware. Placing auth.ts at the root makes the import path
 *   clean:  import { auth } from '@/auth'
 * =============================================================
 */

// ── IMPORTS ────────────────────────────────────────────────────────────────────
//
// KEYWORD: import
//   Brings in code from another file or package.
//   Syntax:  import { thingIWant } from 'package-name';
//   The curly braces { } are used when you want a NAMED export from
//   a module (a specific thing it exports by name).

import NextAuth from 'next-auth';
// ↑ NextAuth is the DEFAULT export from 'next-auth'.
//   A default export has no curly braces around it.
//   NextAuth is a function we call to create our auth handler.

import Credentials from 'next-auth/providers/credentials';
// ↑ The "Credentials" provider enables username/password login.
//   NextAuth supports many "providers" (Google, GitHub, Twitter…).
//   We use Credentials because we want our OWN email+password form,
//   not "Sign in with Google." Each provider is its own module.

import bcrypt from 'bcryptjs';
// ↑ bcryptjs is a password hashing library.
//   We use it for ONE purpose here: bcrypt.compare(plainText, hash).
//   It takes the password the user typed and the hash stored in the
//   database, and tells us if they match — without ever "decoding"
//   the hash (because that's impossible by design).

import pool from '@/lib/db';
// ↑ Our PostgreSQL connection pool from lib/db.ts.
//   The "@/" prefix is a TypeScript "path alias" configured in
//   tsconfig.json. It means "start from the project root."
//   So @/lib/db → c:/Users/.../hbb-tierlist/lib/db.ts.
//   This is cleaner than a relative path like "../../lib/db".

// ─────────────────────────────────────────────────────────────────────────────


// ── TYPE DEFINITION FOR THE DATABASE ROW ──────────────────────────────────────
//
// KEYWORD: type
//   Defines a TypeScript type. A "type" describes the SHAPE of an
//   object — what keys it has and what data type each key holds.
//
//   This is NOT JavaScript. TypeScript adds this. It only exists
//   at development time to catch mistakes; it is stripped out
//   before the code runs in production.
//
// WHY DEFINE THIS TYPE?
//   When we run `pool.query(...)` below, TypeScript doesn't
//   automatically know what shape the returned rows have. By defining
//   `DbUser`, we tell TypeScript exactly what fields to expect.
//   If we typo "passwrod_hash" instead of "password_hash", TypeScript
//   will highlight the error before we even run the server.
// ─────────────────────────────────────────────────────────────────────────────
type DbUser = {
  id: number;           // The user's numeric database ID
  username: string;     // Their display name
  email: string;        // Their login email
  password_hash: string; // The bcrypt hash stored in the DB
};
// ─────────────────────────────────────────────────────────────────────────────


// ── NEXTAUTH CONFIGURATION ────────────────────────────────────────────────────
//
// KEYWORD: export
//   Makes something available to OTHER files that import this file.
//   When you write `export const X`, other files can:
//     import { X } from '@/auth';
//
// We use destructuring to grab specific exports from NextAuth():
//   const { handlers, auth, signIn, signOut } = NextAuth({ ... });
//
// KEYWORD: const
//   Declares a variable that cannot be reassigned.
//   Once { handlers, auth, ... } is set, you can't do:
//     handlers = somethingElse;  ← TypeScript error!
//   Use `const` for anything that shouldn't change after creation.
// ─────────────────────────────────────────────────────────────────────────────
export const { handlers, auth, signIn, signOut } = NextAuth({
  //
  // ── providers ────────────────────────────────────────────────────────────────
  //
  // "providers" is an array ([ ]) of authentication methods.
  // Each "provider" is a plugin that handles a specific login strategy.
  // We only configure ONE: Credentials (email + password).
  //
  // If you wanted to add "Sign in with Google" later, you'd add:
  //   import Google from 'next-auth/providers/google';
  //   providers: [ Credentials({ ... }), Google({ ... }) ]
  // ─────────────────────────────────────────────────────────────────────────
  providers: [

    // ── Credentials Provider ─────────────────────────────────────────────────
    //
    // Credentials() is a function call. We pass it an object { }
    // that configures how the email+password login works.
    // ─────────────────────────────────────────────────────────────────────────
    Credentials({

      // "name" is the display name for this provider.
      // It appears in NextAuth's built-in login form UI (if you use it).
      name: 'Email and Password',

      // ── credentials ────────────────────────────────────────────────────────
      //
      // Defines the FIELDS that the login form should collect.
      // NextAuth uses this to build its default login form AND to
      // know which fields to expect in the request body.
      //
      // Each key ("email", "password") becomes a form field.
      // The value is an object describing that field:
      //   label:       The human-readable label shown above the input.
      //   type:        The HTML input type ('text', 'password', 'email').
      //   placeholder: The greyed-out hint text inside the empty input.
      // ─────────────────────────────────────────────────────────────────────
      credentials: {
        email: {
          label: 'Email',
          type: 'email',
          placeholder: 'you@example.com',
        },
        password: {
          label: 'Password',
          type: 'password',
          placeholder: '••••••••',
        },
      },

      // ── authorize() — THE CORE AUTHENTICATION FUNCTION ─────────────────────
      //
      // KEYWORD: async
      //   Marks a function as "asynchronous." This is required whenever
      //   your function does I/O work (like querying a database or
      //   calling an API) that takes time to complete.
      //
      //   Normal ("synchronous") code runs line by line:
      //     Line 1 → Line 2 → Line 3 …
      //
      //   Asynchronous code says: "Line 2 needs to wait for the database.
      //   While we wait, the JavaScript engine can do other work. When
      //   the database responds, come back and continue from Line 3."
      //
      // PARAMETER: credentials
      //   This object is automatically filled by NextAuth with whatever
      //   the user typed into the login form (email and password).
      //
      // RETURN VALUE:
      //   This function must return either:
      //   - An object representing the user (login succeeds → session created)
      //   - null (login fails → NextAuth shows an error message)
      // ─────────────────────────────────────────────────────────────────────
      async authorize(credentials) {

        // ── Input Validation ──────────────────────────────────────────────────
        //
        // Before touching the database, check that the user actually
        // provided BOTH fields. If either is missing or empty, return
        // null immediately (fail fast, no DB call wasted).
        //
        // KEYWORD: if
        //   Checks a condition. If true, runs the code inside { }.
        //
        // !credentials?.email
        //   The ?. is "optional chaining." It safely accesses `email`
        //   on `credentials` even if credentials itself is null/undefined.
        //   If credentials is null → credentials?.email is undefined.
        //   The ! prefix means "NOT." So !undefined = true = "not provided."
        //
        // ||  means OR. The whole condition means:
        //   "If email is missing OR password is missing..."
        // ─────────────────────────────────────────────────────────────────────
        if (!credentials?.email || !credentials?.password) {
          // Return null to tell NextAuth: "Login failed."
          return null;
        }

        // ── Database Lookup ───────────────────────────────────────────────────
        //
        // KEYWORD: try { } catch { }
        //   A safety net for code that might fail (throw an error).
        //   Code inside `try` runs normally.
        //   If ANY line throws an error, execution jumps to `catch`
        //   and runs the error-handling code there.
        //
        //   WHY USE IT HERE?
        //   The database query can fail if:
        //     - The database server is temporarily unreachable.
        //     - The network connection drops.
        //     - The query itself has a bug.
        //   Without try/catch, an unhandled error would crash the
        //   entire Next.js server process. With it, we gracefully
        //   return null (failed login) and log the real error.
        // ─────────────────────────────────────────────────────────────────────
        try {

          // ── pool.query() — Talking to the Database ──────────────────────────
          //
          // KEYWORD: await
          //   Pauses this function until the database responds.
          //   You can ONLY use `await` inside an `async` function
          //   (which is why `authorize` is marked `async`).
          //
          // pool.query(sql, [params])
          //   Runs a SQL query against your PostgreSQL database.
          //   The FIRST argument is the SQL string.
          //   The SECOND argument is an array of values to substitute
          //   for the $1, $2, $3 placeholders (called "parameterized queries").
          //
          // WHY PARAMETERIZED QUERIES (not string concatenation)?
          //   NEVER write:  `SELECT * FROM users WHERE email = '${email}'`
          //   A malicious user could type:  ' OR '1'='1
          //   And the query becomes:  SELECT * FROM users WHERE email = '' OR '1'='1'
          //   Which returns ALL users — this is a SQL Injection attack.
          //
          //   With parameterized queries, $1 is treated as a DATA VALUE,
          //   not SQL code. The database handles the escaping automatically.
          //   User input can NEVER alter the query structure. This is safe.
          //
          // .rows
          //   pool.query() returns an object with a `rows` property —
          //   an array of the matching database rows. Each row is a
          //   plain JavaScript object with the column names as keys.
          // ─────────────────────────────────────────────────────────────────
          const result = await pool.query<DbUser>(
            // The SQL query: "Find the user whose email matches the input"
            // LIMIT 1: We only need one row (emails are unique anyway,
            // but LIMIT 1 signals intent and prevents accidental multi-row returns).
            'SELECT id, username, email, password_hash FROM users WHERE email = $1 LIMIT 1',
            // The values array: $1 in the SQL gets replaced with this value.
            // We use .toLowerCase() to make login case-insensitive
            // (so "Alice@Example.com" matches "alice@example.com").
            [String(credentials.email).toLowerCase()]
          );

          // result.rows is an array. result.rows[0] is the first (and only) row.
          // We assign it to `user`. If no matching email was found, rows is
          // an empty array and rows[0] is `undefined`.
          const user = result.rows[0];

          // ── Check if user exists ────────────────────────────────────────────
          //
          // If `user` is undefined (no row returned), the email doesn't
          // exist in the database. Return null = login failed.
          // ─────────────────────────────────────────────────────────────────
          if (!user) {
            return null;
          }

          // ── Password Verification ───────────────────────────────────────────
          //
          // bcrypt.compare(plainTextPassword, hashedPassword)
          //   Takes the password the user TYPED (plaintext) and the
          //   hash stored in the database, runs the bcrypt algorithm,
          //   and returns true if they match, false if they don't.
          //
          //   This is NOT "decrypting" the hash. Hashing is one-way.
          //   bcrypt re-hashes the plaintext using the same parameters
          //   embedded in the stored hash and compares the results.
          //
          // KEYWORD: await
          //   bcrypt.compare is async because hashing is computationally
          //   expensive (intentionally — this slows down brute-force attacks).
          //   We await it so the next line waits for the result.
          // ─────────────────────────────────────────────────────────────────
          const passwordsMatch = await bcrypt.compare(
            credentials.password as string,
            // ↑ `as string` is a TypeScript "type assertion."
            //   We're telling TypeScript: "Trust me, this value is a string."
            //   It's needed because credentials.password could technically
            //   be undefined in the type system, but we checked for it above.
            user.password_hash
          );

          // ── Final Decision ──────────────────────────────────────────────────
          //
          // If the password check failed, the user typed the wrong password.
          // Return null to indicate login failure.
          // ─────────────────────────────────────────────────────────────────
          if (!passwordsMatch) {
            return null;
          }

          // ── SUCCESS: Return the User Object ─────────────────────────────────
          //
          // If we reach this line, both the email and password are correct.
          //
          // We return an object with the user's data. NextAuth will:
          //   1. Encode this object into a JWT (a signed token).
          //   2. Store the JWT in a secure browser cookie.
          //   3. On every future request, decode the JWT to identify the user.
          //
          // IMPORTANT: We deliberately exclude `password_hash` from the
          // return value. The password hash must NEVER be included in the
          // JWT/session — it would be unnecessarily transmitted with every
          // request. Only include what the application actually needs.
          // ─────────────────────────────────────────────────────────────────
          return {
            id: user.id.toString(),
            // ↑ NextAuth's User type requires `id` to be a string.
            //   Our database uses an integer. .toString() converts it.
            name: user.username,
            // ↑ NextAuth uses `name` (not `username`) in its standard
            //   User interface. We map our `username` field to `name`.
            email: user.email,
          };

        } catch (error) {
          // ── Error Handling ──────────────────────────────────────────────────
          //
          // If anything in the try block threw an error (DB unreachable, etc.),
          // we land here. We log the real error to the server console for
          // debugging, then return null to the user (a generic "failed" signal).
          //
          // WHY NOT SHOW THE ERROR TO THE USER?
          //   Detailed error messages (like "database is unreachable") can
          //   give attackers information about your infrastructure. Always
          //   log internally, show generics externally.
          //
          // KEYWORD: console.error
          //   Logs to the server's terminal (Node.js stdout), NOT the browser.
          //   You see this in your terminal window when running `npm run dev`.
          // ─────────────────────────────────────────────────────────────────
          console.error('[auth] authorize() error:', error);
          return null;
        }
      }, // ← end of authorize()
    }), // ← end of Credentials()
  ], // ← end of providers array


  // ── session ────────────────────────────────────────────────────────────────
  //
  // Configures HOW NextAuth stores the user's session.
  //
  // strategy: 'jwt'
  //   After login, the user's identity is stored in a JWT (JSON Web Token)
  //   cookie in their browser. No session records are stored in the database.
  //
  //   The JWT is cryptographically signed with your NEXTAUTH_SECRET key.
  //   If someone tampers with the cookie, the signature check fails and
  //   NextAuth rejects it.
  //
  // ALTERNATIVE: strategy: 'database'
  //   Stores sessions in a `sessions` table in PostgreSQL.
  //   Useful for immediate session revocation (e.g., force logout from
  //   all devices). We use JWT because it's simpler and requires no
  //   extra database tables.
  // ─────────────────────────────────────────────────────────────────────────
  session: {
    strategy: 'jwt',
  },


  // ── pages ──────────────────────────────────────────────────────────────────
  //
  // Tells NextAuth which URL paths to use for built-in pages.
  // By default, NextAuth provides a basic login page at /api/auth/signin.
  //
  // Once we build our own beautiful login UI (in a later step),
  // we'll point `signIn` to our custom page here.
  // For now, we use NextAuth's built-in default by leaving this empty,
  // but the structure is ready for you to extend.
  // ─────────────────────────────────────────────────────────────────────────
  pages: {
    // signIn: '/login',  ← Uncomment this when you build your custom login page
  },


  // ── callbacks ──────────────────────────────────────────────────────────────
  //
  // "Callbacks" are functions that NextAuth calls at specific moments
  // in the auth flow, letting you CUSTOMIZE the behavior.
  //
  // We add a `jwt` callback to embed the user's numeric database `id`
  // into the JWT token — because NextAuth's default User type only has
  // a string `id` and we want to preserve it in its correct form.
  // ─────────────────────────────────────────────────────────────────────────
  callbacks: {

    // ── jwt callback ─────────────────────────────────────────────────────────
    //
    // Called EVERY TIME a JWT is created (on login) or verified
    // (on every request that reads the session).
    //
    // PARAMETERS:
    //   token  — The JWT payload (what gets stored in the cookie).
    //   user   — The user object returned by `authorize()`.
    //            Only present on the FIRST call (right after login).
    //            On subsequent calls (session reads), `user` is undefined.
    // ─────────────────────────────────────────────────────────────────────
    async jwt({ token, user }) {
      // On first login, `user` contains the object we returned from authorize().
      // We copy the user's database `id` into the token payload.
      // This way, every subsequent session read has the DB id available.
      if (user) {
        token.id = user.id; // Embed DB id in the JWT
      }
      // Return the (potentially modified) token.
      // NextAuth will sign it and store it in the cookie.
      return token;
    },

    // ── session callback ─────────────────────────────────────────────────────
    //
    // Called when a Server Component or API route calls `auth()` to
    // READ the current session. It transforms the raw JWT token data
    // into the `session` object that your app code receives.
    //
    // WHY THIS CALLBACK?
    //   By default, `session.user` only has { name, email, image }.
    //   We want `session.user.id` to be available in our components
    //   so we know which database user is logged in.
    // ─────────────────────────────────────────────────────────────────────
    async session({ session, token }) {
      // Copy the `id` we embedded in the JWT token into the session object.
      // Now any Server Component can call auth() and access session.user.id.
      if (token && session.user) {
        session.user.id = token.id as string;
      }
      return session;
    },
  },
});
