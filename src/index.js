// Cloudflare Worker for Heather's Cleaning Services.
//
// Cloudflare serves the static files in /public directly. This Worker only
// receives requests that match no file there: the quote form's endpoint,
// and addresses that do not exist.

import { handleInquiry } from "./inquiry.js";

export default {
  async fetch(request, env) {
    const { pathname } = new URL(request.url);

    if (pathname === "/api/inquiry") return handleInquiry(request, env);

    if (pathname.startsWith("/api/")) {
      return Response.json({ ok: false, error: "Not found." }, { status: 404 });
    }

    return new Response(NOT_FOUND_PAGE, {
      status: 404,
      headers: { "Content-Type": "text/html; charset=utf-8" },
    });
  },
};

const NOT_FOUND_PAGE = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<meta name="robots" content="noindex" />
<title>Page not found — Heather's Cleaning Services</title>
<style>
  body { margin: 0; min-height: 100vh; display: grid; place-items: center; padding: 1.5rem; background: #FBFAF7; color: #0A3A3E; font-family: Inter, system-ui, -apple-system, "Segoe UI", Roboto, sans-serif; text-align: center; }
  main { max-width: 30rem; }
  h1 { margin: 0 0 0.75rem; font-family: Georgia, "Times New Roman", serif; font-weight: 500; font-size: 2.4rem; line-height: 1.1; }
  p { margin: 0 0 1.75rem; color: #2C5B5A; font-size: 1.0625rem; line-height: 1.6; }
  a { display: inline-block; padding: 0.95rem 1.7rem; border-radius: 999px; background: #2EC4B6; color: #0A3A3E; font-weight: 600; text-decoration: none; }
</style>
</head>
<body>
<main>
  <h1>That page isn't here.</h1>
  <p>The address may be mistyped, or the page has moved.</p>
  <a href="/">Back to Heather's Cleaning Services</a>
</main>
</body>
</html>`;
