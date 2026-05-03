# site-scaffold

A lightweight starter for streaming SSR + selective hydration on Cloudflare Workers, with R2 as the page cache.

Server is the source of truth for routing — every link is a real navigation. The client only hydrates the page that was rendered, so individual pages can have small interactive bits (a button, a form) without shipping a router or a state library.

```
GET /foo  ──►  Worker.fetch(req)
                │
                ├─ context.run(new ContextStorage({ request: req }), …)
                │   └─ request, url, pathParams, searchParams now live in
                │      AsyncLocalStorage — readable from any helper without
                │      prop-drilling
                │
                ├─ matchRoute(/foo) → { Component, loader, cache, page, pathParams }
                │
                ├─ if route.cache !== false:
                │   └─ R2Cache.match(url)  →  HIT → stream cached HTML
                │
                └─ MISS (or cache:false):
                    ├─ data = await route.loader?.()           ← reads context.store
                    ├─ hydration = { data, page, pathParams,
                    │                searchParams: url.searchParams.toString() }
                    ├─ stream = renderToReadableStream(
                    │             <Document hydration={hydration}>
                    │               <Component data={data} … />
                    │             </Document>)
                    ├─ tee → response body  +  R2Cache.put (waitUntil, when cacheable)
                    └─ stream HTML → browser
                                       │
                                       ▼
                              hydrateRoot(document, …)
                                ├─ JSON.parse(<script id="__data">…</script>)
                                ├─ Component = pages[hydration.page]   ← simple lookup
                                └─ <Component data={data} … />
```

The client never imports the router engine — only the page components and a JSON-keyed lookup. Loaders, route definitions, and the matcher all live worker-side.

---

## Stack

- **Cloudflare Workers** + `@cloudflare/vite-plugin` — single Vite pipeline builds the worker and the client bundle
- **React 19** — `renderToReadableStream` for streaming SSR, `hydrateRoot` for full-document hydration, native `<title>`/`<meta>` hoisting (no helmet lib)
- **`use-request-utils/router`** — pure path-matching engine; lives only in the worker bundle
- **`AsyncLocalStorage`** — per-request context (`request`, `url`, `pathParams`, `searchParams`, …) consumable from any server helper without prop-drilling
- **Auto-discovered pages** — every `app/pages/*.tsx` is registered in `libs/pages.ts` via `import.meta.glob`; drop a file, register it once in `worker/routes.ts`, done
- **Loader pattern** — argless server function per route; reads request data from `context.store`; result is JSON-embedded in `<script id="__data">` and rehydrated on the client without a re-fetch
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
├── libs/                            shared libs — used by both worker and app
│   ├── client-only.tsx              <ClientOnly> + clientOnly() HOC
│   ├── pages.ts                     auto-glob of app/pages/*.tsx → { name: Component }
│   ├── pages.spec.ts
│   ├── router.ts                   createRouter + Route namespace; reverse-lookup engine
│   ├── router.spec.ts
│   ├── safe-json.ts                 XSS-safe JSON encoder for <script> embedding
│   └── safe-json.spec.ts
├── app/                             rendered output (server + client)
│   ├── components/
│   │   ├── article-card.tsx         list item used by /articles
│   │   ├── head.tsx                 SEO wrapper using React 19 metadata hoisting
│   │   └── markdown.tsx             <Markdown content={...} /> — reusable prose renderer
│   ├── content/articles/            *.md — auto-discovered articles
│   ├── libs/
│   │   ├── articles.ts              app-specific feature: glob + frontmatter + excerpt
│   │   └── articles.spec.ts
│   ├── pages/                       drop a *.tsx file here → auto-registered
│   │   ├── article.tsx              /articles/:slug
│   │   ├── articles.tsx             /articles index
│   │   ├── home.tsx                 / — interactive counter (hydration proof)
│   │   ├── not-found.tsx            catch-all
│   │   └── slug.tsx                 /:slug — pulls slug from pathParams
│   ├── styles/index.css             tailwind tokens + typography plugin
│   ├── document.tsx                 <html>/<head>/<body>, Inter, dev preamble, __data
│   └── index.tsx                    client entry — reads __data, hydrates pages[hydration.page]
├── worker/                          server-only
│   ├── context.ts                   AsyncLocalStorage<ContextStorage> singleton
│   ├── context.spec.ts
│   ├── context-storage.ts           per-request: request, url, pathParams, searchParams
│   ├── context-storage.spec.ts
│   ├── index.ts                     fetch handler — wraps everything in context.run()
│   ├── r2-cache.ts                  two-layer cache (volatile + R2)
│   ├── r2-cache.spec.ts
│   ├── render.tsx                   renderStream + renderWithCache + renderHtml
│   ├── render.spec.ts
│   └── routes.ts                    route registrations + inline loaders
├── constants.ts                     SITE_NAME, CACHE_*, DEV
├── index.html                       placeholder — never served, only triggers vite client build
├── vite.config.ts                   cloudflare + react + tailwind
├── wrangler.jsonc                   worker name, R2 binding, assets config
├── wrangler.test.jsonc              minimal test wrangler config
└── vitest.config.mts                defineWorkersConfig (singleWorker)
```

---

## How it works

### 1. Auto-discovered pages

`libs/pages.ts` globs every component file in `app/pages/` and exports them keyed by filename:

```ts
const modules = import.meta.glob<Route.PageComponent>('../app/pages/*.tsx', {
	eager: true,
	import: 'default'
});

const pages = _.mapKeys(modules, (_value, key) => {
	return key.match(/\/([^/]+)\.tsx$/)?.[1] ?? key;
});
//   { home, articles, article, slug, 'not-found' }
```

This is the single registry both the worker (for routing) and the client (for hydration) consume. Drop `app/pages/profile.tsx` and `pages.profile` exists — no manifest, no switch to update.

### 2. Server-only route table

`worker/routes.ts` is the only place that imports the router engine. It registers paths against components from `pages` and (optionally) declares a loader inline:

```ts
const router = createRouter(pages)
	.notFound({ Component: pages['not-found'] })
	.add('/', { Component: pages.home })
	.add('/articles', { Component: pages.articles })
	.add('/articles/:slug', {
		Component: pages.article,
		loader: () => {
			return getArticleBySlug(
				String(context.store.pathParams.slug ?? '')
			);
		}
	})
	.add('/:slug', { Component: pages.slug });

export default router.match;
```

`createRouter(pages)` builds a `Component → page-key` reverse-lookup once at startup — that's how the `page` identifier in the hydration meta is derived. **The user never declares `page`** anywhere; it falls out of the Component reference. `.notFound(handler)` is required (the router throws on first `.match()` if absent) and accepts the same `Handler` shape as `.add()`, so the not-found page can carry its own `meta` / `jsonLd` / `cacheScope` like any other route.

In dev, `add()` and `notFound()` throw if you pass a Component that isn't in the pages map (catches typos / forgetting to drop the file in `app/pages/`).

Because `routes.ts` lives in `worker/`, it's only bundled into the SSR build. Loader bodies — which may pull secrets from KV, hit D1, or execute auth — never reach the client.

### 3. Per-request context (AsyncLocalStorage)

`worker/index.ts` wraps every request in `context.run(...)` exactly once:

```ts
const handler = {
	async fetch(req: Request): Promise<Response> {
		if (req.method !== 'GET' && req.method !== 'HEAD') {
			return new Response('Method not allowed', { status: 405 });
		}

		return context.run(new ContextStorage({ request: req }), async () => {
			try {
				return await renderHtml(req);
			} catch (err) {
				console.error('Worker error:', err);
				return new Response('Internal server error', { status: 500 });
			}
		});
	}
};
```

`ContextStorage` exposes `request`, `url`, `pathParams`, `searchParams`. The renderer fills `pathParams` after route match; everything else is derived in the constructor. Any helper called during SSR (loaders, model methods, future RPC handlers, …) reads via `context.store` without prop-drilling:

```ts
loader: () => {
	const slug = context.store.pathParams.slug;
	const sort = context.store.searchParams.get('sort');
	// …
};
```

The class is designed to grow — add fields/lazy getters for `env`, `lang`, `cookies`, `models`, `getAccount(...)`, etc. without changing any function signature in the codebase.

### 4. Hydration meta

`renderStream` builds a `Route.Hydration` object and passes it to `<Document>`:

```ts
const hydration: Route.Hydration = {
	data, // loader output
	page: route.page, // 'article' (derived)
	pathParams: route.pathParams, // { slug: 'hello' }
	searchParams: url.searchParams.toString() // serialized 'a=1&b=2'
};
```

`<Document>` JSON-encodes it into `<script id="__data" type="application/json">…</script>` via the XSS-safe encoder in `libs/safe-json.ts`. `searchParams` is serialized as a query string so it round-trips through JSON.

### 5. Client-side component lookup

`app/index.tsx` is tiny and does **not** import `libs/router.ts`:

```tsx
import pages from '@/libs/pages';

const hydration = readHydration();
const Component = pages[hydration.page] ?? pages['not-found'];
const searchParams = new URLSearchParams(hydration.searchParams);

hydrateRoot(
	document,
	<StrictMode>
		<Document hydration={hydration}>
			<Component
				data={hydration.data}
				pathParams={hydration.pathParams}
				searchParams={searchParams}
			/>
		</Document>
	</StrictMode>
);
```

Dictionary lookup. No matcher, no loaders, no `RouterEngine`, no path patterns in the client bundle. Adding a route doesn't require touching this file.

### 6. End-to-end: adding a new page

1. **Drop** `app/pages/profile.tsx` exporting a `Route.PageProps`-shaped component.
2. **Register** in `worker/routes.ts`:
    ```ts
    .add('/profile', {
        Component: pages.profile,
        loader: () => { /* optional */ }
    })
    ```
3. Done. The client picks it up via the auto-discovered map.

---

## Articles

Drop a `.md` file into `app/content/articles/` and it shows up at `/articles` and `/articles/<filename>`. No registration. Powered by `import.meta.glob('../content/articles/*.md', { query: '?raw', eager: true })` — articles are bundled at build time, so it works inside the Cloudflare Workers runtime with zero filesystem access.

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

A loader is an argless async function on a route handler. It runs **only on the worker** during SSR, the result is rendered into the HTML, and the same value is read back on hydration so the component renders byte-identically without a re-fetch.

```ts
// worker/routes.ts
.add('/articles/:slug', {
    Component: pages.article,
    loader: () => {
        return getArticleBySlug(
            String(context.store.pathParams.slug ?? '')
        );
    }
})
```

The page consumes the result via the `data` prop, narrowing it with a runtime type guard:

```tsx
// app/pages/article.tsx
import type { Route } from '@/libs/router';

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

### Reading request data inside a loader

Anything request-scoped flows through `context.store`:

```ts
import context from '@/worker/context';

loader: () => {
	const slug = context.store.pathParams.slug;
	const sort = context.store.searchParams.get('sort');
	const cookie = context.store.request.headers.get('cookie');
	// …
};
```

For Cloudflare bindings (`CACHE`, KV, D1, DO) and `waitUntil`, import them directly from `'cloudflare:workers'` — same convention as `worker/r2-cache.ts`. No `env` plumbing through any signature.

### Cache opt-out for per-request dynamic routes

Routes that read `request.headers` (auth, cookies, geo, A/B) must not be cached by URL alone. Set `cache: false`:

```ts
.add('/me', {
    cache: false,
    Component: pages.me,
    loader: () => {
        const session = context.store.request.headers.get('cookie');
        return /* per-user data */;
    }
})
```

`renderWithCache` short-circuits on `cache: false` — the page streams fresh on every hit, never read from / written to R2.

### Client-only components

`cache: false` is the route-level escape hatch. The component-level equivalent is `<ClientOnly>` — wrap children of an otherwise-cached page that must never appear in the SSR output, either because they read browser APIs (`window`, `localStorage`, `matchMedia`) or because they render user-specific / time-sensitive data that would poison the shared cache.

```tsx
import ClientOnly from '@/libs/client-only';

<ClientOnly fallback={<div className='h-10 w-32' />}>
	<UserBadge />
</ClientOnly>;
```

The server emits `fallback` (default `null`); the real children render only after hydration, via `useSyncExternalStore` — no `useEffect` round-trip, no hydration mismatch. The cached HTML therefore contains the placeholder, not the client-only output.

For components that are _inherently_ client-only, use the `clientOnly` HOC. It also tags the component so `router.match` will refuse to use it as a page (throws in dev, falls back to the `NotFound` page in production):

```tsx
import { clientOnly } from '@/libs/client-only';

const UserBadge = clientOnly(UserBadgeImpl);
```

**Limitation.** This only guards rendering, not module evaluation. A library that touches `window` at the top of its module will still execute on the worker on import. Keep that work inside the component body (`useEffect`, lazy refs).

### Safe JSON embedding

`libs/safe-json.ts` escapes `<`, `>`, `&`, U+2028, U+2029 before serializing into the HTML — so a loader returning `{ html: '</script><script>alert(1)</script>' }` cannot break out of the data block. The covered values are equivalent to the `htmlEscapeJsonString` set used by Next.js / Remix loaders.

### Limits

- Loader output **must be JSON-serializable** — no `Date`, `Map`, `Set`, functions. Convert to strings/arrays at the loader boundary.
- Loaders run **before** streaming starts; they're not Suspense-aware. For progressive data, wrap the page in `<Suspense>` and `await` inside an async child instead of using a loader.
- Mutations / form actions are not part of the loader pattern (read-only by design). Add a separate POST handler in `worker/index.ts` if you need them.

---

## Design notes

### Server is the source of truth

Routing happens only on the worker. The client doesn't match URLs — it reads the `page` key out of the hydration meta and looks up `pages[page]`. Because both sides render the same Component with the same `data` (server's loader output, embedded in `__data`, parsed on hydration), the SSR HTML and the hydration tree are byte-identical.

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

React 19 hoists any `<title>`, `<meta>`, `<link>` rendered anywhere in the tree into the document `<head>` automatically — both during SSR (rendered into the head of the streamed HTML) and on the client (mutated via `document.head`). Routes declare a `meta` callback in `worker/routes.ts`; `<DocumentHead>` (in `app/document.tsx`) reads the resolved value off hydration and emits the tags. No helmet library, no per-page hand-rolled head component.

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
app/libs/articles.spec.ts        (23 tests)  buildExcerpt, computeReadingTime,
                                              getArticleBySlug, getArticles,
                                              parseMarkdownDocument, renderMarkdown,
                                              slugFromPath, stripMarkdown
libs/pages.spec.ts               (2 tests)   auto-discovery + value shape
libs/router.spec.ts              (14 tests)  createRouter validation, add() guards,
                                              match notFound + cache + loader +
                                              page derivation + pathParams + order
libs/safe-json.spec.ts           (6 tests)   round-trip, escapes, U+2028/2029
worker/context.spec.ts           (7 tests)   run / store / nested / concurrent
worker/context-storage.spec.ts   (5 tests)   request, url, searchParams, pathParams
worker/r2-cache.spec.ts          (12 tests)  key + match + put + volatile:false
worker/render.spec.ts            (19 tests)  shell, routing, hydration meta
                                              (page + pathParams + searchParams),
                                              renderWithCache, renderHtml
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
