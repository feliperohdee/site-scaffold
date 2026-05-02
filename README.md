# site-scaffold

A lightweight starter for streaming SSR + selective hydration on Cloudflare Workers, with R2 as the page cache.

Server is the source of truth for routing — every link is a real navigation. The client only hydrates the page that was rendered, so individual pages can have small interactive bits (a button, a form) without shipping a router or a state library.

```
GET /foo  ──►  Worker
                │
                ├─ try R2Cache.match(url)
                │   └─ HIT  ──► stream cached HTML, set x-{slug}-cache: HIT
                │
                └─ MISS:
                    ├─ matchRoute(/foo) → { Component, pathParams }
                    ├─ stream = renderToReadableStream(<Document><Component /></Document>)
                    ├─ tee → response body  +  R2Cache.put (waitUntil)
                    └─ stream HTML → browser  ──►  hydrateRoot(document, ...)
```

---

## Stack

- **Cloudflare Workers** + `@cloudflare/vite-plugin` — single Vite pipeline builds the worker and the client bundle
- **React 19** — `renderToReadableStream` for streaming SSR, `hydrateRoot` for full-document hydration, native `<title>`/`<meta>` hoisting (no helmet lib)
- **`use-request-utils/router`** — pure path-matching engine (no browser APIs, no React) shared by the worker and the client
- **R2** — page cache, keyed by full URL, versioned by build timestamp
- **Tailwind CSS v4** — single `@import 'tailwindcss';`, no shadcn, no theme tokens
- **Vitest** with `@cloudflare/vitest-pool-workers` — runs tests against a real workerd runtime

No SPA routing. No client-side navigation. No `popstate`. No state library.

---

## Quick start

```bash
yarn install
yarn dev          # vite dev server on port 5174
yarn build        # production build
yarn deploy       # build + wrangler deploy
yarn test         # 26 tests, vitest in workerd pool
yarn check-types  # tsc --noEmit
yarn lint         # prettier + eslint
```

In dev mode the R2 cache is bypassed — every request streams a fresh SSR so HMR / live edits show up immediately. In production, every request hits R2 first; cache misses render and write back via `waitUntil`.

---

## Renaming for a new project

Single source of truth for branding:

```ts
// constants.ts
const SITE_NAME = 'Site Scaffold';   // ← change this
```

Everything derives from it via `lodash/kebabCase`:

| Constant | Derived value |
|---|---|
| `SITE_NAME` | `'Site Scaffold'` |
| `CACHE_HEADER` | `'x-site-scaffold-cache'` |
| `CACHE_CREATED_AT_HEADER` | `'x-site-scaffold-cache-created-at'` |
| Page titles | `'Home — Site Scaffold'`, etc. |

Two more places to update by hand (declarative config — can't import from TS):

```jsonc
// wrangler.jsonc
"name": "site-scaffold",
"r2_buckets": [{ "binding": "CACHE", "bucket_name": "site-scaffold-cache" }]
```

```jsonc
// wrangler.test.jsonc — same two values
```

```json
// package.json
"name": "site-scaffold"
```

---

## Project layout

```
.
├── app/
│   ├── components/head.tsx       SEO wrapper using React 19 metadata hoisting
│   ├── pages/
│   │   ├── home.tsx              / — interactive counter (hydration proof)
│   │   ├── slug.tsx              /:slug — pulls slug from pathParams
│   │   └── not-found.tsx         catch-all
│   ├── styles/index.css          @import 'tailwindcss';
│   ├── document.tsx              <html>/<head>/<body> root, dev refresh preamble
│   ├── index.tsx                 client entry — hydrateRoot(document, ...)
│   └── routes.ts                 shared matcher (worker + client)
├── worker/
│   ├── index.ts                  fetch handler (GET/HEAD only)
│   ├── render.tsx                renderStream + renderWithCache + renderHtml
│   ├── render.spec.ts            14 tests
│   ├── r2-cache.ts               two-layer cache (volatile + R2)
│   └── r2-cache.spec.ts          12 tests
├── constants.ts                  SITE_NAME, CACHE_*, DEV
├── index.html                    placeholder — never served, only triggers vite client build
├── vite.config.ts                cloudflare + react + tailwind, stable client.js / client.css names
├── wrangler.jsonc                worker name, R2 binding, assets config
├── wrangler.test.jsonc           minimal test wrangler config
└── vitest.config.mts             defineWorkersConfig
```

---

## Design notes

### Server is the source of truth

The matcher in `app/routes.ts` is imported by both the worker (to pick a component for SSR) and `app/index.tsx` (to pick the same component for `hydrateRoot`). Server and client read the URL from their own native source — `req.url` and `window.location` — and arrive at the same component, so hydration always matches.

Links are plain `<a href>`. Clicks trigger full browser navigation, the worker SSRs the new page, the client hydrates it. There is no client router, no popstate listener, no link interception.

### Cache key & invalidation

R2 cache key:
```
pages/{CACHE_VERSION}/{pathname}{?sorted-query}
```

`CACHE_VERSION` is `'dev'` in dev (and dev never caches anyway) and `v-{__BUILD_TIME__}` in production, where `__BUILD_TIME__` is replaced by Vite at build time (`define: { __BUILD_TIME__: JSON.stringify(String(Date.now())) }`). Every `yarn build` produces a fresh version → the next request misses → the new HTML is cached. Old keys eventually age out via R2's lifecycle / cost-based eviction.

### Streaming + cache write

```ts
const stream = await renderToReadableStream(<Document>...</Document>);
const [bodyForClient, bodyForCache] = stream.tee();

waitUntil(async () => {
    const bytes = await new Response(bodyForCache).arrayBuffer();
    await cache.put(cacheKey, new Response(bytes, { headers }));
});

return new Response(bodyForClient, { headers });
```

Client gets bytes immediately. Cache write happens in the background. The cache half is buffered to `ArrayBuffer` because R2's `put` requires a known content-length.

### Helmet without a library

React 19 hoists any `<title>`, `<meta>`, `<link>` rendered anywhere in the tree into the document `<head>` automatically — both during SSR (rendered into the head of the streamed HTML) and on the client (mutated via `document.head`). The `<Head>` component (`app/components/head.tsx`) is a 30-line wrapper that just emits these tags.

### Asset paths

`vite.config.ts` forces a stable client entry filename:

```ts
rollupOptions: {
    output: {
        entryFileNames: 'assets/client.js',
        assetFileNames: info => {
            if (info.names?.[0]?.endsWith('.css')) { return 'assets/client.css'; }
            return 'assets/[name]-[hash].[ext]';
        }
    }
}
```

`<Document>` then references them with a one-liner: `DEV ? '/app/index.tsx' : '/assets/client.js'` (and same pattern for CSS). No build-time manifest plumbing.

### React Refresh in dev

`<Document>` injects a one-shot `<script type="module">` in dev that imports `/@react-refresh` and installs the global hooks. Combined with the bootstrap `<script type="module" defer src={clientEntry}>` in body, the two run in document order — preamble first, app second — so Fast Refresh wires up before any component module is parsed.

The bootstrap script is rendered by `<Document>` itself (not via React's `bootstrapModules`) so it's `defer` (document order) instead of `async` (race).

---

## Tests

```
worker/r2-cache.spec.ts (12 tests)
  describe('key')          — prefix, sorting, leading-slash trim, encoding
  describe('match')        — R2 hit, volatile hit, double miss
  describe('put')          — defaults, null body, both layers
  describe('volatile: false') — skip volatile layer

worker/render.spec.ts (14 tests)
  describe('renderStream')      — shell, doctype, root mount, bootstrap script,
                                  React Refresh preamble, routing, head hoisting
  describe('renderWithCache')   — cache hit, cache miss, waitUntil → put
  describe('renderHtml')        — bypasses cache when CACHE_ENABLED=false
```

`vitest.config.mts` runs them in `singleWorker` mode against a real workerd runtime so R2 calls hit the local R2 simulator.

---

## Out of scope (deliberately)

- Client-side navigation / SPA router
- Suspense boundaries in the demo pages (the framework supports them — `renderToReadableStream` + `tee()` already streams; just add `<Suspense>` where you want progressive fallbacks)
- Per-build hashed client bundle (stable filename + R2 version bump handles cache busting)
- Domain routing in `wrangler.jsonc`
- CORS

---

## License

MIT.
