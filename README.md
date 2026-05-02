# site-scaffold

A lightweight starter for streaming SSR + selective hydration on Cloudflare Workers, with R2 as the page cache.

Server is the source of truth for routing — every link is a real navigation. The client only hydrates the page that was rendered, so individual pages can have small interactive bits (a button, a form) without shipping a router or a state library.

```
GET /foo  ──►  Worker
                │
                ├─ matchRoute(/foo) → { Component, loader, cache, pathParams }
                │
                ├─ if route.cache !== false:
                │   └─ R2Cache.match(url)
                │       └─ HIT  ──► stream cached HTML, set x-{slug}-cache: HIT
                │
                └─ MISS (or cache:false):
                    ├─ data = await loader?.({ pathParams, request, searchParams })
                    ├─ stream = renderToReadableStream(
                    │             <Document data={data}>
                    │               <Component data={data} ... />
                    │             </Document>)
                    ├─ tee → response body  +  R2Cache.put (waitUntil, when cacheable)
                    └─ stream HTML → browser
                                       │
                                       ▼
                                hydrateRoot(document, …)
                                  ├─ JSON.parse(<script id="__data">…</script>)
                                  └─ <Component data={data} ... />
```

---

## Stack

- **Cloudflare Workers** + `@cloudflare/vite-plugin` — single Vite pipeline builds the worker and the client bundle
- **React 19** — `renderToReadableStream` for streaming SSR, `hydrateRoot` for full-document hydration, native `<title>`/`<meta>` hoisting (no helmet lib)
- **`use-request-utils/router`** — pure path-matching engine (no browser APIs, no React) shared by the worker and the client
- **Loader pattern** — per-route `loader(ctx)` server function for seeding component data from KV / R2 / D1 / external HTTP / per-request headers (auth, cookies); result is JSON-embedded into the HTML and rehydrated on the client without a re-fetch
- **R2** — page cache, keyed by full URL, versioned by build timestamp
- **Tailwind CSS v4** + `@tailwindcss/typography` — Inter font, custom `--tracking-display` token, bold-headline minimalist base
- **`marked`** — markdown → HTML for the article system
- **Vitest** with `@cloudflare/vitest-pool-workers` — runs tests against a real workerd runtime

No SPA routing. No client-side navigation. No `popstate`. No state library.

---

## Quick start

```bash
yarn install
yarn dev          # vite dev server on port 5174
yarn build        # production build
yarn deploy       # build + wrangler deploy
yarn test         # run tests
yarn check-types  # tsc --noEmit
yarn lint         # prettier + eslint
```

In dev mode the R2 cache is bypassed — every request streams a fresh SSR so HMR / live edits show up immediately. In production, every request hits R2 first; cache misses render and write back via `waitUntil`.

---

## Renaming for a new project

Single source of truth for branding:

```ts
// constants.ts
const SITE_NAME = 'Site Scaffold'; // ← change this
```

Everything derives from it via `lodash/kebabCase`:

| Constant                  | Derived value                        |
| ------------------------- | ------------------------------------ |
| `SITE_NAME`               | `'Site Scaffold'`                    |
| `CACHE_HEADER`            | `'x-site-scaffold-cache'`            |
| `CACHE_CREATED_AT_HEADER` | `'x-site-scaffold-cache-created-at'` |
| Page titles               | `'Home — Site Scaffold'`, etc.       |

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
│   ├── components/
│   │   ├── article-card.tsx      list item used by /articles
│   │   ├── head.tsx              SEO wrapper using React 19 metadata hoisting
│   │   └── markdown.tsx          <Markdown content={...} /> — reusable prose renderer
│   ├── content/
│   │   └── articles/             *.md — auto-discovered articles
│   ├── libs/
│   │   ├── articles.ts           glob discovery + frontmatter + excerpt + reading time
│   │   ├── articles.spec.ts      23 tests
│   │   ├── router.ts             createRouter + Route namespace (types) — matcher core
│   │   ├── router.spec.ts        9 tests
│   │   ├── safe-json.ts          XSS-safe JSON encoder for <script> embedding
│   │   └── safe-json.spec.ts     6 tests
│   ├── pages/
│   │   ├── article.tsx           /articles/:slug
│   │   ├── articles.tsx          /articles index
│   │   ├── home.tsx              / — interactive counter (hydration proof)
│   │   ├── not-found.tsx         catch-all
│   │   └── slug.tsx              /:slug — pulls slug from pathParams
│   ├── styles/index.css          @import 'tailwindcss'; @plugin '@tailwindcss/typography'; @theme tokens
│   ├── document.tsx              <html>/<head>/<body> root, Inter font links, dev refresh preamble, __data script
│   ├── index.tsx                 client entry — reads __data, hydrateRoot(document, ...)
│   └── routes.ts                 route registrations (config; logic lives in libs/router.ts)
├── worker/
│   ├── index.ts                  fetch handler (GET/HEAD only)
│   ├── render.tsx                renderStream + renderWithCache + renderHtml
│   ├── render.spec.ts            17 tests
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

## Articles

Drop a `.md` file into `app/content/articles/` and it shows up at `/articles` and `/articles/<filename>`. No registration. Powered by Vite's `import.meta.glob('../content/articles/*.md', { query: '?raw', eager: true })` — articles are bundled at build time, so it works inside the Cloudflare Workers runtime with zero filesystem access.

```markdown
---
title: Hello, World
date: 2026-05-02
excerpt: Optional — auto-generated from the body when omitted.
tags: [meta, writing]
---

# Hello, World

Body in regular markdown. Headings, lists, code blocks, tables, links, blockquotes — all styled by `@tailwindcss/typography`.
```

`app/libs/articles.ts` exposes `getArticles()`, `getArticleBySlug(slug)`, and `renderMarkdown(content)`. Each article carries `{ slug, title, date, excerpt, tags, readingTime, content }`. The frontmatter parser is a tiny inline YAML-ish reader (no `gray-matter` / Buffer dep).

`<Markdown content={...} className?={...} />` is the reusable renderer — drop it on any page that needs to display markdown, not just articles.

---

## Server functions / loaders

Each route can declare an async `loader(ctx)` that runs **only on the worker** during SSR. The return value is rendered into the HTML, serialized as JSON into a `<script id="__data" type="application/json">…</script>` block, and read back on hydration so the component renders the same data on the client without a re-fetch.

```ts
// app/routes.ts — pure config; the matcher itself lives in app/libs/router.ts
const router = createRouter(NotFoundPage)
	.add('/', { Component: HomePage })
	.add('/articles/:slug', {
		Component: ArticlePage,
		loader: ({ pathParams }) => {
			return getArticleBySlug(String(pathParams.slug ?? ''));
		}
	});

export default router.match;
```

The page consumes the result via the `data` prop, narrowing it with a runtime type guard:

```tsx
// app/pages/article.tsx
import type { Route } from '@/app/libs/router';

const isArticle = (value: unknown): value is Article => {
	return _.isObject(value) && 'slug' in value && 'content' in value;
};

const Article = ({ data }: Route.PageProps) => {
	if (!isArticle(data)) {
		return <NotFound />;
	}
	return <Markdown content={data.content} />;
};
```

### Loader context

```ts
type LoaderContext = {
	pathParams: Record<string, unknown>;
	request: Request; // headers, cookies, auth
	searchParams: URLSearchParams;
};
```

For Cloudflare bindings (`CACHE`, KV, D1, DO) and `waitUntil`, import them directly from `'cloudflare:workers'` — same convention as `worker/r2-cache.ts`. No `env` plumbing through the loader signature.

```ts
loader: async ({ pathParams }) => {
	const { env } = await import('cloudflare:workers');
	return await env.CACHE.get(`page/${pathParams.slug}`);
};
```

### Cache opt-out for per-request dynamic routes

Routes that read `request.headers` (auth, cookies, geo, A/B) must not be cached by URL alone. Set `cache: false`:

```ts
router.add('/me', {
	Component: MePage,
	cache: false,
	loader: ({ request }) => {
		const session = request.headers.get('cookie');
		return /* per-user data */;
	}
});
```

`renderWithCache` short-circuits on `cache: false` — the page streams fresh on every hit, never read from / written to R2.

### Safe JSON embedding

`app/libs/safe-json.ts` escapes `<`, `>`, `&`, U+2028, U+2029 before serializing into the HTML — so a loader returning `{ html: '</script><script>alert(1)</script>' }` cannot break out of the data block. The covered values are equivalent to the `htmlEscapeJsonString` set used by Next.js / Remix loaders.

### Limits

- Loader output **must be JSON-serializable** — no `Date`, `Map`, `Set`, functions. Convert to strings/arrays at the loader boundary.
- Loaders run **before** streaming starts; they're not Suspense-aware. For progressive data, wrap the page in `<Suspense>` and `await` inside an async child instead of using a loader.
- Mutations / form actions are not part of the loader pattern (read-only by design). Add a separate POST handler in `worker/index.ts` if you need them.

---

## Design notes

### Server is the source of truth

The matcher in `app/routes.ts` is imported by both the worker (to pick a component for SSR) and `app/index.tsx` (to pick the same component for `hydrateRoot`). Server and client read the URL from their own native source — `req.url` and `window.location` — and arrive at the same component, so hydration always matches. The loader runs **only on the worker** — the client never re-runs it; it reads the same data from the embedded `<script id="__data">` so the rendered tree on both sides is byte-identical.

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
app/libs/articles.spec.ts (23 tests)
  describe('buildExcerpt')        — override, short body, ellipsis truncation
  describe('computeReadingTime')  — 1-min minimum, 200wpm rounding
  describe('getArticleBySlug')    — match + null on miss
  describe('getArticles')         — discovery, parsed metadata, date desc sort
  describe('parseFrontmatter')    — string/quoted/array values, malformed lines
  describe('renderMarkdown')      — HTML output, empty input
  describe('slugFromPath')        — directory + extension stripping
  describe('stripMarkdown')       — fences, images/links, headings/lists/emphasis

app/libs/router.spec.ts (9 tests)
  describe('createRouter')
    describe('add')              — chainable
    describe('match')            — notFound fallback, cache default + opt-out,
                                   Component lookup, loader exposure / null,
                                   pathParams extraction, registration order

app/libs/safe-json.spec.ts (6 tests)
  describe('safeJsonStringify')  — round-trip, < / > / & escaping, U+2028/2029,
                                   undefined → null, no </script> bleed

worker/r2-cache.spec.ts (12 tests)
  describe('key')          — prefix, sorting, leading-slash trim, encoding
  describe('match')        — R2 hit, volatile hit, double miss
  describe('put')          — defaults, null body, both layers
  describe('volatile: false') — skip volatile layer

worker/render.spec.ts (17 tests)
  describe('renderStream')      — shell, doctype, root mount, bootstrap script,
                                  React Refresh preamble, __data script,
                                  routing, head hoisting, loader output embedding
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
