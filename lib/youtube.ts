/**
 * lib/youtube.ts
 * =============================================================
 * YouTube Data API v3 — Fetch Latest Videos with ISR Caching
 * =============================================================
 *
 * WHAT IS THIS FILE?
 *   A "utility module" — a file that exports reusable functions
 *   that other parts of the app can import and call.
 *
 *   This file has ONE job: reach out to YouTube's servers, ask
 *   for the latest videos from a specific channel, and return
 *   them in a clean, predictable format our app can use.
 *
 * HOW DOES IT REACH THE INTERNET?
 *   It uses the browser-standard `fetch()` function.
 *   In older Node.js (before v18), `fetch` didn't exist.
 *   Next.js 16 runs on Node.js 18+ which has native `fetch` built in.
 *   No extra library needed — it's always available globally.
 *
 *   A `fetch()` call is like having a conversation:
 *     YOU: "Hey YouTube, give me the 10 latest videos for channel XYZ."
 *     YOUTUBE: "Here you go" [sends JSON data]
 *     YOU: "Thanks, let me parse that JSON and give it to the app."
 *
 * WHAT IS CACHING (revalidate)?
 *   YouTube allows a limited number of API calls per day (quota).
 *   Making a fresh API call on EVERY page load would be wasteful
 *   and could exhaust your quota fast.
 *
 *   Next.js has a built-in caching layer for `fetch()`. By passing
 *   `next: { revalidate: 3600 }` in the fetch options, we tell
 *   Next.js: "Cache this response for 3600 seconds (60 minutes).
 *   If a user requests this data within 60 minutes of the last fetch,
 *   return the cached copy — don't hit YouTube's servers again."
 *
 *   After 60 minutes, on the next request that needs this data,
 *   Next.js silently fetches fresh data in the background while
 *   immediately serving the (slightly stale) cached version.
 *   This is called "Incremental Static Regeneration" (ISR).
 *
 * HOW TO USE THIS FILE:
 *   import { fetchBothChannels } from '@/lib/youtube';
 *   const videos = await fetchBothChannels();
 * =============================================================
 */


// ── NO IMPORTS NEEDED ─────────────────────────────────────────────────────────
//
// We don't import anything at the top of this file because:
//   - `fetch()` is globally available in Next.js (no import needed).
//   - `process.env` is globally available in Node.js (no import needed).
//   - TypeScript types are defined in this file itself.
//
// This keeps the file self-contained and easy to understand.
// ─────────────────────────────────────────────────────────────────────────────


// =============================================================
// SECTION 1: TypeScript Interfaces (Shapes)
// =============================================================
//
// KEYWORD: interface
//   Defines the SHAPE of an object in TypeScript.
//   Similar to `type` (which we used in other files), but
//   interfaces are the conventional choice when describing
//   the shape of objects (especially API responses).
//
// WHAT ARE THESE FOR?
//   The YouTube API returns a large, complex JSON object.
//   By defining interfaces that match its structure, TypeScript
//   can verify that we're accessing the right fields.
//   If YouTube changes a field name, TypeScript will warn us.
// =============================================================


// ── YouTubeThumbnail ──────────────────────────────────────────────────────────
//
// YouTube provides multiple sizes of thumbnail for each video.
// Each size has a `url` (the image URL) and dimensions.
// ─────────────────────────────────────────────────────────────────────────────
interface YouTubeThumbnail {
  url: string;     // The direct URL to the thumbnail image
  width: number;   // Image width in pixels
  height: number;  // Image height in pixels
}


// ── YouTubeVideoItem ──────────────────────────────────────────────────────────
//
// Represents a single video in the YouTube API response.
// The YouTube API organises data into a hierarchy:
//   item.id.videoId       → the unique video ID (used in youtube.com/watch?v=...)
//   item.snippet.title    → the video title
//   item.snippet.publishedAt → when it was published
//   etc.
//
// This interface mirrors that structure so TypeScript understands
// how to navigate it when we write item.snippet.thumbnails.high.url
// ─────────────────────────────────────────────────────────────────────────────
interface YouTubeVideoItem {
  // `kind` and `etag` are metadata YouTube always includes.
  // We define them here for completeness but may not use them.
  kind: string;
  etag: string;

  // `id` contains the actual video identifier.
  id: {
    kind: string;
    videoId: string;
    // ↑ THIS is the value you append to:
    //   https://www.youtube.com/watch?v=<videoId>
  };

  // `snippet` contains human-readable metadata about the video.
  snippet: {
    publishedAt: string;       // ISO 8601 date string: "2026-07-24T10:00:00Z"
    channelId: string;          // The channel's unique ID
    title: string;              // Video title (e.g., "Best IEMs of 2026")
    description: string;        // Full video description text
    channelTitle: string;       // The channel's display name

    // `thumbnails` has multiple size variants. We use `high` (480x360px).
    thumbnails: {
      default: YouTubeThumbnail; // 120x90px
      medium: YouTubeThumbnail;  // 320x180px
      high: YouTubeThumbnail;    // 480x360px
    };
  };
}


// ── YouTubeApiResponse ────────────────────────────────────────────────────────
//
// The top-level shape of what the YouTube Data API v3 sends back
// when you call the "search" endpoint.
//
// The full response has many more fields (nextPageToken, regionCode, etc.)
// We only define the parts we actually need. TypeScript doesn't
// complain about extra fields — only about fields we try to ACCESS
// that don't exist in the interface.
// ─────────────────────────────────────────────────────────────────────────────
interface YouTubeApiResponse {
  kind: string;   // Always "youtube#searchListResponse"
  etag: string;   // A cache identifier YouTube sends

  // `pageInfo` tells us the total number of available results.
  pageInfo: {
    totalResults: number;
    resultsPerPage: number;
  };

  // `items` is the array of videos we asked for.
  // Each item matches the YouTubeVideoItem interface above.
  items: YouTubeVideoItem[];
}


// ── OUR CLEANED-UP VIDEO TYPE ─────────────────────────────────────────────────
//
// After fetching from YouTube, we reshape the data into a cleaner
// format that's easier for our app's components to consume.
// We don't expose the full YouTubeVideoItem structure — just the
// fields we know the UI will need.
//
// This is called "data normalisation" — transforming raw API data
// into a shape optimised for your application's needs.
// ─────────────────────────────────────────────────────────────────────────────
export interface VideoSummary {
  videoId: string;       // The YouTube video ID (for building watch URLs)
  title: string;         // The video title
  channelTitle: string;  // The channel's display name
  publishedAt: string;   // ISO date string of when it was published
  thumbnailUrl: string;  // Direct URL to the high-quality thumbnail image
  watchUrl: string;      // Full YouTube watch URL (convenience field)
}
// ↑ KEYWORD: export interface
//   The `export` keyword makes this interface importable by other files.
//   Without `export`, the interface is private to this file.
//   Components that display videos will import `VideoSummary` as their
//   prop type, ensuring type safety all the way from the API to the UI.


// =============================================================
// SECTION 2: The Core Fetch Function
// =============================================================


// ── fetchLatestVideos ─────────────────────────────────────────────────────────
/**
 * Fetches the latest videos from a single YouTube channel.
 *
 * HOW TO READ A FUNCTION SIGNATURE (for beginners):
 *
 *   async function fetchLatestVideos(channelId: string, maxResults: number = 10)
 *   │     │        │                 │           │       │           │     │
 *   │     │        │                 │           │       │           │     └── Default value if not provided
 *   │     │        │                 │           │       │           └────── TypeScript type of the parameter
 *   │     │        │                 │           │       └────────────────── Parameter name
 *   │     │        │                 │           └────────────────────────── TypeScript type of channelId
 *   │     │        │                 └────────────────────────────────────── First parameter name
 *   │     │        └────────────────────────────────────────────────────── Function name
 *   │     └─────────────────────────────────────────────────────────────── Makes it asynchronous
 *   └───────────────────────────────────────────────────────────────────── Keyword to declare a function
 *
 * RETURN TYPE: Promise<VideoSummary[]>
 *   This function returns a "Promise" — a special JavaScript object
 *   that represents a value that doesn't exist YET but will in the future.
 *   Because we use `await` at the call site, you don't have to manually
 *   handle the Promise — it "unwraps" automatically.
 *
 *   `VideoSummary[]` means "an array of VideoSummary objects."
 *   The `[]` suffix denotes an array type in TypeScript.
 *
 * @param channelId - The YouTube channel ID (e.g., "UCnUYZLuoy1rq1aVMwx4aTzw")
 * @param maxResults - How many videos to return (default: 10, max: 50 per YouTube's limits)
 */
export async function fetchLatestVideos(
  channelId: string,
  maxResults: number = 10
): Promise<VideoSummary[]> {

  // ── STEP 1: Read the API key from environment variables ─────────────────────
  //
  // KEYWORD: process.env
  //   In Node.js, `process` is a global object representing the current
  //   running process. `process.env` is a plain object containing all
  //   environment variables set on the system or in your .env.local file.
  //
  //   WHY ENVIRONMENT VARIABLES AND NOT HARD-CODED?
  //   If you wrote:  const apiKey = 'AIzaSyABC123yourActualKey';
  //   And committed that file to Git, your API key would be PUBLIC.
  //   Anyone could find it on GitHub and use your quota.
  //
  //   With process.env.YOUTUBE_API_KEY, the key lives only in .env.local
  //   which is git-ignored. Different environments (development, production)
  //   can have different keys. The source code is safe to share publicly.
  // ─────────────────────────────────────────────────────────────────────────
  const apiKey = process.env.YOUTUBE_API_KEY;

  // Guard: if the API key isn't configured, fail loudly so the developer
  // knows immediately what's wrong (missing environment variable).
  if (!apiKey) {
    throw new Error(
      '[youtube.ts] YOUTUBE_API_KEY is not set in your .env.local file. ' +
      'Get a key from Google Cloud Console → APIs & Services → YouTube Data API v3.'
    );
  }


  // ── STEP 2: Build the YouTube API URL ───────────────────────────────────────
  //
  // The YouTube Data API v3 "search" endpoint URL format:
  //   https://www.googleapis.com/youtube/v3/search?<parameters>
  //
  // KEYWORD: URL (built-in browser/Node API)
  //   A standard class for constructing URLs safely.
  //   It handles encoding special characters (spaces → %20, etc.)
  //   so you don't accidentally break the URL.
  //
  // KEYWORD: URLSearchParams
  //   A helper for building query strings (?key=value&key2=value2).
  //   We pass an object with all the parameters we want.
  //
  // EACH PARAMETER EXPLAINED:
  //   key          → Your API key (required for all requests)
  //   channelId    → The channel whose videos we want
  //   part         → Which "parts" of the video data to include.
  //                  'snippet' includes title, description, thumbnails.
  //                  More parts = larger response = costs more quota.
  //   order        → Sort results by 'date' (newest first)
  //   type         → Only return 'video' results (not playlists or channels)
  //   maxResults   → How many results to return (1–50)
  // ─────────────────────────────────────────────────────────────────────────
  const params = new URLSearchParams({
    key: apiKey,
    channelId: channelId,
    part: 'snippet',
    order: 'date',
    type: 'video',
    maxResults: maxResults.toString(),
    // ↑ URLSearchParams requires all values to be strings.
    //   maxResults is a number, so we convert it with .toString()
  });

  // Assemble the full URL string.
  // Template literal (backtick string) interpolates variables with ${...}
  const apiUrl = `https://www.googleapis.com/youtube/v3/search?${params.toString()}`;


  // ── STEP 3: Fetch from YouTube with ISR Caching ──────────────────────────────
  //
  // fetch(url, options)
  //   The built-in function to make HTTP requests.
  //   It returns a Promise that resolves to a Response object.
  //
  // THE KEY TO CACHING: `next: { revalidate: 3600 }`
  //   This is a NEXT.JS EXTENSION to the standard fetch() options.
  //   Standard fetch() doesn't have a `next` property — Next.js
  //   intercepts the fetch call and adds its own caching layer.
  //
  //   `revalidate: 3600` means:
  //     "Cache this fetch result for 3600 seconds (= 60 minutes)."
  //
  //   HOW ISR (INCREMENTAL STATIC REGENERATION) WORKS:
  //
  //   Timeline:
  //   T=0:00  First request arrives. Next.js fetches from YouTube. Caches result.
  //   T=0:05  Second request arrives. Next.js returns CACHED result. No YouTube call.
  //   T=0:30  Third request arrives. Still within 60 min. Returns cache.
  //   T=1:01  Sixtieth-first minute. Cache is "stale." Next.js returns the old
  //           cached result to the user IMMEDIATELY (no waiting), but ALSO
  //           starts a background fetch from YouTube to refresh the cache.
  //   T=1:01+ Next request arrives. Gets the freshly updated cache.
  //
  //   RESULT: Users always get an instant response, and YouTube data
  //   refreshes automatically every hour. You use at most 24 API calls
  //   per day per channel (24 hours × 1 call per hour) instead of
  //   one call for every single page view.
  // ─────────────────────────────────────────────────────────────────────────
  const response = await fetch(apiUrl, {
    // This `next` property is Next.js-specific. It configures ISR caching.
    next: {
      revalidate: 3600, // 3600 seconds = 60 minutes
    },
  });


  // ── STEP 4: Check for HTTP errors ───────────────────────────────────────────
  //
  // fetch() does NOT throw an error on HTTP error codes like 403, 404, 500.
  // It only throws on NETWORK failures (no internet connection, etc.).
  //
  // response.ok is true when the HTTP status code is 200–299.
  // We must manually check it and throw for non-OK responses.
  //
  // Common YouTube API errors:
  //   403 Forbidden: API key is invalid or quota exceeded.
  //   400 Bad Request: channelId is invalid.
  //   404 Not Found: Channel doesn't exist.
  // ─────────────────────────────────────────────────────────────────────────
  if (!response.ok) {
    // response.status: the numeric HTTP status code (e.g., 403)
    // response.statusText: the text description (e.g., "Forbidden")
    throw new Error(
      `[youtube.ts] YouTube API request failed: ${response.status} ${response.statusText}. ` +
      `Channel ID: ${channelId}. Check your API key and quota in Google Cloud Console.`
    );
  }


  // ── STEP 5: Parse the JSON response ────────────────────────────────────────
  //
  // response.json()
  //   Reads the response body (a text stream) and parses it as JSON,
  //   returning a JavaScript object.
  //
  //   `as YouTubeApiResponse` is a TypeScript type assertion.
  //   We're telling TypeScript: "Trust that this JSON matches our interface."
  //   TypeScript cannot verify this at runtime — but our interface was
  //   carefully defined to match YouTube's documented response shape.
  // ─────────────────────────────────────────────────────────────────────────
  const data = await response.json() as YouTubeApiResponse;


  // ── STEP 6: Transform & Return Clean Data ───────────────────────────────────
  //
  // data.items is the raw array of YouTube video objects.
  // We use `.map()` to transform each raw item into our clean VideoSummary type.
  //
  // KEYWORD: .map()
  //   An array method that creates a NEW array by running a function
  //   on every element of the original array.
  //
  //   Syntax: array.map(item => transformedItem)
  //
  //   The `=>` arrow notation is a compact way to write a function:
  //     (item) => { return result; }
  //   is the same as:
  //     function(item) { return result; }
  //
  //   EXAMPLE:
  //     [1, 2, 3].map(n => n * 2)  →  [2, 4, 6]
  //     Here we transform each YouTube item object into our VideoSummary object.
  //
  // `.filter(item => item.id?.videoId)`
  //   Sometimes YouTube's search endpoint includes "channel" or "playlist"
  //   results even when type='video'. These don't have a videoId.
  //   `.filter()` removes items for which the callback returns falsy.
  //   We filter before mapping so .map() always gets items with videoId.
  // ─────────────────────────────────────────────────────────────────────────
  const videos: VideoSummary[] = data.items
    .filter(item => item.id?.videoId) // Keep only items that have a videoId
    .map(item => ({
      // Extracting the fields we care about from the raw YouTube item:
      videoId: item.id.videoId,
      title: item.snippet.title,
      channelTitle: item.snippet.channelTitle,
      publishedAt: item.snippet.publishedAt,
      thumbnailUrl: item.snippet.thumbnails.high.url,
      // Building a convenience watch URL from the videoId:
      watchUrl: `https://www.youtube.com/watch?v=${item.id.videoId}`,
    }));

  // Return the clean, transformed array of video summaries.
  return videos;
}


// =============================================================
// SECTION 3: Convenience Function for Both Channels
// =============================================================


// ── fetchBothChannels ─────────────────────────────────────────────────────────
/**
 * Fetches the latest videos from BOTH configured YouTube channels
 * and returns them combined in a single array.
 *
 * This is the function your dashboard page will call.
 * It reads both channel IDs from environment variables so you
 * can change them in .env.local without touching this code.
 *
 * KEYWORD: Promise.all
 *   Takes an ARRAY of Promises and runs them IN PARALLEL.
 *   Without Promise.all, you'd have to await them one at a time:
 *     const ch1 = await fetchLatestVideos(id1);  // wait for this...
 *     const ch2 = await fetchLatestVideos(id2);  // THEN wait for this
 *     // Total time: time1 + time2 (sequential)
 *
 *   With Promise.all, both fetches start AT THE SAME TIME:
 *     const [ch1, ch2] = await Promise.all([fetch(id1), fetch(id2)]);
 *     // Total time: max(time1, time2) (parallel) — roughly twice as fast!
 *
 * @returns A combined, sorted array of VideoSummary from both channels.
 */
export async function fetchBothChannels(): Promise<VideoSummary[]> {

  // Read the channel IDs from environment variables.
  const channelId1 = process.env.YOUTUBE_CHANNEL_ID_1;
  const channelId2 = process.env.YOUTUBE_CHANNEL_ID_2;

  // Guard: if either channel ID is missing, fail loudly.
  if (!channelId1 || !channelId2) {
    throw new Error(
      '[youtube.ts] YOUTUBE_CHANNEL_ID_1 and YOUTUBE_CHANNEL_ID_2 must be ' +
      'set in your .env.local file. Find a channel ID by going to the channel ' +
      'page on YouTube, clicking "More" and then "About", then View Source.'
    );
  }

  // ── Fetch both channels in parallel ────────────────────────────────────────
  //
  // Promise.all([promise1, promise2, ...])
  //   Waits for ALL promises in the array to resolve.
  //   Returns an array of their results IN THE SAME ORDER as the input.
  //
  //   Destructuring syntax: const [result1, result2] = await Promise.all(...)
  //   Extracts the first result into `channelOneVideos` and the second
  //   into `channelTwoVideos` in a single, clean statement.
  // ─────────────────────────────────────────────────────────────────────────
  const [channelOneVideos, channelTwoVideos] = await Promise.all([
    fetchLatestVideos(channelId1, 10), // Fetch 10 latest from channel 1
    fetchLatestVideos(channelId2, 10), // Fetch 10 latest from channel 2
  ]);

  // ── Combine both arrays into one ────────────────────────────────────────────
  //
  // Spread operator: [...array1, ...array2]
  //   Creates a NEW array containing all items from array1 followed by
  //   all items from array2. The three dots `...` "spread" (unpack) the
  //   elements of each array into the new array.
  //
  //   Example: [...[1,2], ...[3,4]] → [1, 2, 3, 4]
  // ─────────────────────────────────────────────────────────────────────────
  const combined = [...channelOneVideos, ...channelTwoVideos];

  // ── Sort combined results by date (newest first) ────────────────────────────
  //
  // .sort(comparatorFn)
  //   Sorts the array in-place. The comparator function receives two
  //   elements (a, b) and must return:
  //     - A negative number if `a` should come BEFORE `b`.
  //     - A positive number if `a` should come AFTER `b`.
  //     - 0 if they are equal (order doesn't matter).
  //
  // new Date(dateString).getTime()
  //   Converts an ISO date string ("2026-07-24T10:00:00Z") to a Unix
  //   timestamp — the number of milliseconds since January 1, 1970.
  //   Timestamps are plain numbers, easy to compare with subtraction.
  //
  // b.time - a.time (b minus a):
  //   If b is newer (larger timestamp) than a, result is positive → b first.
  //   This sorts in DESCENDING order (newest at index 0).
  // ─────────────────────────────────────────────────────────────────────────
  combined.sort((a, b) => {
    const aTime = new Date(a.publishedAt).getTime();
    const bTime = new Date(b.publishedAt).getTime();
    return bTime - aTime; // Descending: newest first
  });

  return combined;
}
