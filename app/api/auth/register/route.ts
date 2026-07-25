/**
 * app/api/auth/register/route.ts
 * =============================================================
 * API Route: POST /api/auth/register
 * =============================================================
 *
 * WHAT IS THIS FILE?
 *   This is an API endpoint that lets new users create accounts.
 *   It is NOT part of NextAuth — it's a plain Next.js API route
 *   that we wrote ourselves to handle user registration.
 *
 * WHY DOESN'T NEXTAUTH HANDLE REGISTRATION?
 *   NextAuth only handles AUTHENTICATION (verifying someone's
 *   identity). It doesn't handle REGISTRATION (creating new
 *   accounts). We have to write that part ourselves.
 *
 * HOW THIS ENDPOINT WORKS (step by step):
 *   1. Client sends:  POST /api/auth/register
 *                     Body: { "username": "Alice", "email": "alice@example.com", "password": "secret" }
 *   2. We validate the inputs (nothing empty, email looks valid).
 *   3. We hash the password with bcrypt.
 *   4. We INSERT the new user into the `users` database table.
 *   5. We return the newly created user (minus password_hash).
 *
 * WHAT IS AN API ROUTE?
 *   An "API route" is a URL on your server that responds to HTTP
 *   requests with data (usually JSON) instead of an HTML page.
 *   The browser (or another service) sends a request;
 *   your code processes it and sends back a JSON response.
 *
 * FILE LOCATION DETERMINES THE URL:
 *   app/api/auth/register/route.ts → accessible at /api/auth/register
 *   Next.js App Router maps folder paths to URL paths automatically.
 * =============================================================
 */

// ── IMPORTS ────────────────────────────────────────────────────────────────────

import { NextRequest, NextResponse } from 'next/server';
// ↑ NextRequest:  Represents an incoming HTTP request in Next.js.
//   It has properties like request.method (GET/POST/…), request.headers,
//   and request.json() to parse the request body.
//
// ↑ NextResponse: A helper to build HTTP responses in Next.js.
//   Instead of manually crafting a response, we use:
//     NextResponse.json({ data }, { status: 200 })
//   It automatically sets the Content-Type header to application/json.

import bcrypt from 'bcryptjs';
// ↑ For hashing the user's password before storing it.
//   bcrypt.hash(plainText, costFactor) → returns a hash string.

import pool from '@/lib/db';
// ↑ Our PostgreSQL connection pool.

// ─────────────────────────────────────────────────────────────────────────────


// ── TYPE: expected request body ───────────────────────────────────────────────
//
// KEYWORD: type
//   Defines the shape of the JSON object we expect in the request body.
//   TypeScript uses this to give us autocomplete and catch typos.
//
// This is purely a TypeScript construct — it disappears at runtime.
// At runtime, we just have a plain JavaScript object.
// ─────────────────────────────────────────────────────────────────────────────
type RegisterBody = {
  username: string;
  email: string;
  password: string;
};


// ── THE POST HANDLER FUNCTION ─────────────────────────────────────────────────
//
// KEYWORD: export
//   Makes this function visible to Next.js's routing system.
//
// KEYWORD: async
//   This function is asynchronous because it:
//     1. Reads the request body (async I/O).
//     2. Hashes the password (CPU-intensive, wrapped as async).
//     3. Writes to the database (network I/O).
//   Any time a function uses `await`, it must be declared `async`.
//
// NAMING: `POST`
//   Next.js App Router requires exported functions in route.ts files
//   to be named after HTTP methods: GET, POST, PUT, DELETE, PATCH.
//   Naming this function `POST` means it ONLY handles POST requests.
//   A GET to /api/auth/register would get a 405 Method Not Allowed.
//
// PARAMETER: request
//   When Next.js calls this function, it automatically passes in the
//   incoming HTTP request as a `NextRequest` object.
//   We use `request` to read the body (what the client sent us).
// ─────────────────────────────────────────────────────────────────────────────
export async function POST(request: NextRequest) {

  // ── STEP 1: Parse the request body ─────────────────────────────────────────
  //
  // KEYWORD: try / catch
  //   Wraps the entire handler in error protection. If anything goes
  //   wrong (bad JSON in request, database error, etc.), we catch the
  //   error and return a proper HTTP 500 response instead of crashing.
  // ─────────────────────────────────────────────────────────────────────────
  try {

    // request.json()
    //   Reads the raw HTTP request body and parses it as JSON.
    //   Returns a JavaScript object.
    //
    //   KEYWORD: await
    //     Reading the body is an async operation. We await it so the
    //     next line waits for the parsed object before continuing.
    //
    //   `as RegisterBody`
    //     A TypeScript "type assertion." We tell TypeScript: "Treat
    //     the result as a RegisterBody object." This gives us type
    //     checking on the properties we access below (username, email, password).
    const body = await request.json() as RegisterBody;

    // ── Destructure the body ──────────────────────────────────────────────────
    //
    // KEYWORD: const { username, email, password } = body;
    //   "Destructuring" — a shorthand to extract multiple properties
    //   from an object into individual variables at once.
    //
    //   WITHOUT destructuring:
    //     const username = body.username;
    //     const email    = body.email;
    //     const password = body.password;
    //
    //   WITH destructuring (what we do below):
    //     const { username, email, password } = body;
    //   Both are exactly equivalent. Destructuring is just shorter.
    // ─────────────────────────────────────────────────────────────────────────
    const { username, email, password } = body;


    // ── STEP 2: Validate Inputs ─────────────────────────────────────────────
    //
    // NEVER trust data coming from the client. Always validate on the server.
    // Even if you have JavaScript validation in the browser, a malicious
    // user can bypass it by sending requests directly (e.g., with Postman).
    //
    // We check that all three fields are present and non-empty strings.
    // ─────────────────────────────────────────────────────────────────────────

    // !username
    //   The ! operator means "NOT." In JavaScript, an empty string ""
    //   is "falsy" (treated as false). So !""  === true.
    //   !undefined === true. !"Alice" === false.
    //
    // .trim()
    //   Removes leading and trailing whitespace from a string.
    //   "  " (just spaces) would pass !username but fail !"  ".trim()
    //   because "  ".trim() === "" which is falsy.
    //
    // The three checks combined: all three fields must be non-empty non-whitespace strings.
    if (!username?.trim() || !email?.trim() || !password?.trim()) {
      // NextResponse.json({ error }, { status })
      //   Returns an HTTP response with a JSON body and the given status code.
      //
      //   HTTP status codes for errors:
      //     400 Bad Request → the client sent invalid data (our case here)
      //     401 Unauthorized → not logged in
      //     403 Forbidden → logged in but not allowed
      //     404 Not Found → resource doesn't exist
      //     409 Conflict → resource already exists (used below for duplicates)
      //     500 Internal Server Error → something broke on our end
      return NextResponse.json(
        { error: 'Username, email, and password are all required.' },
        { status: 400 }
      );
    }

    // Basic email format check using a Regular Expression (regex).
    // KEYWORD: .test()
    //   Tests whether a string matches a pattern. Returns true or false.
    //
    // /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    //   This is the regex pattern. It reads: "one or more non-space
    //   non-@ characters, then @, then more characters, then a dot,
    //   then more characters." It's a simplified email validator.
    //   Full RFC 5322 validation is much more complex, but this
    //   catches obvious mistakes like "notanemail" or "missing@dot".
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { error: 'Please provide a valid email address.' },
        { status: 400 }
      );
    }

    // Password length check.
    // We require at least 8 characters — a bare minimum for security.
    // .length returns the number of characters in a string.
    if (password.length < 8) {
      return NextResponse.json(
        { error: 'Password must be at least 8 characters long.' },
        { status: 400 }
      );
    }


    // ── STEP 3: Hash the Password ──────────────────────────────────────────────
    //
    // bcrypt.hash(plainText, saltRounds)
    //   Hashes the password. NEVER store the plain text password.
    //
    //   WHAT IS A "SALT"?
    //   Before hashing, bcrypt generates a random "salt" — a unique
    //   string prepended to the password. This means two users with
    //   the same password get DIFFERENT hashes, so a rainbow table
    //   attack (pre-computed hash lookups) is useless.
    //
    //   WHAT IS "saltRounds" (the second argument, 12)?
    //   It's the "cost factor" — how many times bcrypt iterates its
    //   hashing algorithm. Higher = slower = more secure against brute force.
    //   - saltRounds 10: ~100ms per hash (good for most apps)
    //   - saltRounds 12: ~400ms per hash (stronger, good for security-sensitive apps)
    //   - saltRounds 14: ~1600ms per hash (overkill for most uses)
    //   We use 12 as a solid balance between security and response time.
    //
    // KEYWORD: await
    //   bcrypt.hash is async because hashing is CPU-intensive and
    //   Node.js runs it on a worker thread to not block other requests.
    // ─────────────────────────────────────────────────────────────────────────
    const passwordHash = await bcrypt.hash(password, 12);


    // ── STEP 4: Insert the New User into the Database ───────────────────────
    //
    // pool.query<ReturnType>(sql, values)
    //   The generic <ReturnType> tells TypeScript what shape the
    //   returned rows have. We define it inline as an anonymous type.
    //
    // RETURNING clause:
    //   Normally an INSERT statement doesn't return any data.
    //   The PostgreSQL RETURNING clause tells it to also return
    //   the specified columns from the newly inserted row.
    //   This saves us a second SELECT query just to get the new ID.
    //
    // $1, $2, $3 are parameter placeholders. Their values are:
    //   $1 → username.trim().toLowerCase()   (normalised)
    //   $2 → email.trim().toLowerCase()       (normalised)
    //   $3 → passwordHash                     (the bcrypt hash string)
    //
    //   We use .toLowerCase() for consistent storage — if someone
    //   registers as "Alice@Example.COM" we store "alice@example.com"
    //   so that lookups are case-insensitive by default.
    // ─────────────────────────────────────────────────────────────────────────
    const result = await pool.query<{ id: number; username: string; email: string; created_at: Date }>(
      `INSERT INTO users (username, email, password_hash)
       VALUES ($1, $2, $3)
       RETURNING id, username, email, created_at`,
      [
        username.trim().toLowerCase(),
        email.trim().toLowerCase(),
        passwordHash,
      ]
    );

    // result.rows[0] is the newly created user row returned by RETURNING.
    const newUser = result.rows[0];


    // ── STEP 5: Return Success Response ─────────────────────────────────────
    //
    // HTTP 201 Created: The standard success code for "a new resource was created."
    // (200 OK is for successful reads; 201 is for successful creates.)
    //
    // We return the new user's public data — no password hash included.
    // The client (e.g., a registration form) can use this to immediately
    // log the user in or redirect to a success page.
    // ─────────────────────────────────────────────────────────────────────────
    return NextResponse.json(
      {
        message: 'Account created successfully.',
        user: {
          id: newUser.id,
          username: newUser.username,
          email: newUser.email,
          createdAt: newUser.created_at,
        },
      },
      { status: 201 }
    );

  } catch (error: unknown) {
    // ── CATCH BLOCK: Handle errors ────────────────────────────────────────────
    //
    // KEYWORD: unknown
    //   In modern TypeScript, catch block errors are typed as `unknown`
    //   because TypeScript can't know in advance what was thrown.
    //   We must narrow the type before using it.
    //
    // COMMON ERROR: Unique constraint violation
    //   If the email or username already exists, PostgreSQL throws:
    //     error.code === '23505' (unique_violation)
    //   We check for this specifically to give the user a helpful message
    //   ("email already in use") instead of a generic server error.
    // ─────────────────────────────────────────────────────────────────────────

    // Check if this is a PostgreSQL error with a code property.
    // We use `typeof` to safely narrow the type before accessing .code.
    if (
      typeof error === 'object' &&
      error !== null &&
      'code' in error &&
      (error as { code: string }).code === '23505'
    ) {
      // PostgreSQL error code 23505 = unique_violation.
      // The email or username is already registered.
      return NextResponse.json(
        { error: 'An account with this email or username already exists.' },
        { status: 409 }
        // HTTP 409 Conflict: The request conflicts with the current state
        // of the server (i.e., the resource already exists).
      );
    }

    // For all other unexpected errors, log internally and return a
    // generic 500 Internal Server Error. Don't expose details to the client.
    console.error('[POST /api/auth/register] Unexpected error:', error);
    return NextResponse.json(
      { error: 'Something went wrong on our end. Please try again later.' },
      { status: 500 }
    );
  }
}
