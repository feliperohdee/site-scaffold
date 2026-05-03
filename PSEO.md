# pSEO — Programmatic SEO

This is the user guide for the pSEO subsystem. Per-property API reference
lives in IDE intellisense via [`libs/pseo/types.ts`](libs/pseo/types.ts).

---

## What is pSEO?

Programmatic SEO is the strategy of producing many pages from one template +
one dataset, so that each page targets a different long-tail search query.
Examples of well-known pSEO sites:

| Site          | Page shape                                                           |
| ------------- | -------------------------------------------------------------------- |
| Zapier        | "Connect &lt;App A&gt; with &lt;App B&gt;" — one page per app pair   |
| TripAdvisor   | "Things to do in &lt;City&gt;" — one page per city                   |
| G2 / Capterra | "&lt;Product&gt; alternatives" — one page per product                |
| NerdWallet    | "Best &lt;type&gt; credit cards in &lt;year&gt;" — one page per type |
| Notion        | "&lt;Job&gt; templates" — one page per job                           |
| Wise          | "Send money to &lt;country&gt;" — one page per country               |

In this codebase you author ONE config (a `Pseo.Definition<T>` file under
`app/pseo/collections/`) and the system handles: route registration,
server-side rendering, per-URL SEO meta tags, schema.org JSON-LD, sitemap
inclusion, and per-collection cache versioning.

## The mental model

A collection has two URL surfaces:

1. The **hub** (e.g. `/best-coffee`) — index page listing all items.
2. The **items** (e.g. `/best-coffee/:slug`) — one URL per row in the dataset.

You provide:

- `list()` — returns the dataset (sync or async).
- `Component`s — React components for the hub and item pages.
- `meta()` — produces `<title>` / description / canonical / og:\* per page.
- `jsonLd()` — produces schema.org payloads (rich-result eligibility).
- `indexable()` — quality gate (returns false → noindex + sitemap exclusion).
- `version` — cache version (bump to invalidate the whole collection).

Everything else (sitemap entries, robots noindex tags, JSON-LD `<script>`
emission, route registration) is wired up automatically from this one config.

---

## 1. Decide the URL shape

Pick a path pattern and a key. The key is the field on each item that maps to
the URL's path param.

| URL                    | path                 | key       |
| ---------------------- | -------------------- | --------- |
| `/widgets/blue-widget` | `/widgets/:slug`     | `slug`    |
| `/products/12345`      | `/products/:id`      | `id`      |
| `/from/portugal`       | `/from/:country`     | `country` |
| `/best-coffee/lisbon`  | `/best-coffee/:slug` | `slug`    |

Hub URL is conventionally the collection root (`/widgets`, `/products`, etc.).

## 2. Define your item type

Where the data lives is up to you — a static array, a JSON glob, an API, a
DynamoDB table. The only contract: `list()` returns `T[]`.

```ts
// e.g. types co-located with the page Component
type Widget = {
	color: string;
	description: string;
	name: string;
	rating: number;
	reviewCount: number;
	slug: string;
	updatedAt: string;
};
```

## 3. Build the page Components

Create two React components under `app/pseo/pages/`:

- **`<collection>-item.tsx`** — renders one item (the spoke). Receives the
  matched item via `data` (Route.PageProps). Narrow `data` with a type
  guard before rendering:

    ```tsx
    const WidgetItem = ({ data }: Route.PageProps) => {
    	if (!isWidget(data)) {
    		return <NotFound />;
    	}
    	return <h1>{data.name}</h1>;
    };
    ```

- **`<collection>-hub.tsx`** — renders the hub page. Receives the full
  list via `data`. Render a simple `<ul>` of `<a>` links — that's enough
  crawl signal for hub-and-spoke.

See the worked example for the full shape:

- [`app/pseo/pages/best-coffee-item.tsx`](app/pseo/pages/best-coffee-item.tsx)
- [`app/pseo/pages/best-coffee-hub.tsx`](app/pseo/pages/best-coffee-hub.tsx)

## 4. Write the collection definition

Drop a new file in `app/pseo/collections/`. The filename has no semantic
weight — pick something readable. Auto-discovery picks up everything in this
folder.

```ts
// app/pseo/collections/widgets.ts
import _ from 'lodash';

import widgetHub from '@/app/pseo/pages/widget-hub';
import widgetItem from '@/app/pseo/pages/widget-item';

import type { Pseo } from '@/libs/pseo/types';
import type { Widget } from '@/app/pseo/pages/widget-item';

const widgets: Widget[] = [
	/* … your dataset … */
];

const definition: Pseo.Definition<Widget> = {
	hub: {
		Component: widgetHub,
		jsonLd: ({ items }) => {
			return {
				'@context': 'https://schema.org',
				'@type': 'CollectionPage',
				numberOfItems: _.size(items)
			};
		},
		meta: () => {
			return { canonical: '/widgets', title: 'Every widget' };
		},
		path: '/widgets'
	},

	item: {
		Component: widgetItem,
		indexable: ({ item }) => {
			return item.reviewCount >= 10;
		},
		itemVersion: ({ item }) => {
			return item.updatedAt;
		},
		jsonLd: ({ item }) => {
			return {
				'@context': 'https://schema.org',
				'@type': 'Product',
				aggregateRating: {
					'@type': 'AggregateRating',
					ratingValue: item.rating,
					reviewCount: item.reviewCount
				},
				name: item.name
			};
		},
		key: 'slug',
		list: () => {
			return widgets;
		},
		meta: ({ item }) => {
			return {
				canonical: `/widgets/${item.slug}`,
				description: `${item.name} — ${item.description}`,
				title: `${item.name} (${item.color}) — review`
			};
		},
		path: '/widgets/:slug'
	},

	name: 'widgets',
	version: '1'
};

export default definition;
```

That's it. Save the file, restart the dev server, and:

- `/widgets` renders the hub.
- `/widgets/<slug>` renders an item.
- `/sitemap.xml` lists `widgets` as a contributor.
- `/sitemap-widgets.xml` lists every indexable item URL.

No registration step, no router edits, no sitemap edits.

## 5. Verify locally

```sh
yarn dev
```

Then in a browser, view source on each URL and confirm:

- `<title>` and `<meta name="description">` reflect the per-item meta.
- `<link rel="canonical">` is present.
- `<script type="application/ld+json">` contains your schema.org payload.
- For a thin item (where `indexable()` returns `false`):
  `<meta name="robots" content="noindex,nofollow">` is present.
- `/sitemap.xml` contains `<loc>…/sitemap-<your-collection>.xml</loc>`.
- `/sitemap-<your-collection>.xml` lists exactly the indexable URLs.
- `/robots.txt` references `/sitemap.xml`.

---

## What every property does (quick reference)

For per-property hover docs, see [`libs/pseo/types.ts`](libs/pseo/types.ts).
At a glance:

### `Pseo.Definition<T>`

| Field     | Required | What it does                                                                        |
| --------- | -------- | ----------------------------------------------------------------------------------- |
| `name`    | yes      | Unique identifier — used in cache keys (`c/<name>/…`) and sitemap chunk URLs.       |
| `version` | no       | Bump to invalidate every URL in this collection without touching unrelated caches.  |
| `item`    | yes      | The per-URL spoke configuration (see below).                                        |
| `hub`     | yes      | Index page (or `null`). Strongly recommended — without it spokes are crawl-orphans. |

### `item: { … }`

| Field         | Required | What it does                                                                               |
| ------------- | -------- | ------------------------------------------------------------------------------------------ |
| `path`        | yes      | URL pattern with one path param matching `key` (e.g. `/widgets/:slug`).                    |
| `key`         | yes      | Item field used to resolve the path param (e.g. `'slug'`).                                 |
| `list`        | yes      | Returns the full dataset. Sync or async.                                                   |
| `Component`   | yes      | React component rendered for each URL.                                                     |
| `meta`        | no       | Returns `<title>` / description / canonical / og:\* per item.                              |
| `jsonLd`      | no       | Returns schema.org payload(s) per item — emitted as `<script type="application/ld+json">`. |
| `indexable`   | no       | Returns `false` to noindex + exclude from sitemap. Use this as a quality gate.             |
| `itemVersion` | no       | Per-item cache segment (typically `item.updatedAt`) — fine-grained invalidation.           |

### `hub: { … }`

| Field       | Required | What it does                                                  |
| ----------- | -------- | ------------------------------------------------------------- |
| `path`      | yes      | URL where the hub lives (e.g. `/widgets`).                    |
| `Component` | yes      | React component rendered for the hub.                         |
| `meta`      | no       | Returns hub `<title>` / description / canonical / og:\*.      |
| `jsonLd`    | no       | Returns hub-level schema.org payload (e.g. `CollectionPage`). |

---

## SEO playbook (the "why" behind the API)

### Quality gate is non-negotiable

The single biggest 2026 risk for pSEO sites is indexing thin pages. Use
`indexable()` to keep URLs out of Google's index when they don't yet have
enough content. The page still renders a 200 OK — only the indexability
signal is suppressed. When the underlying data fills out, the URL flips back
to indexable automatically.

```ts
indexable: ({ item }) => {
	return item.reviewCount >= 10;
}; // marketplace
indexable: ({ item }) => {
	return !!item.description;
}; // catalog
indexable: ({ item }) => {
	return item.placesCount >= 5;
}; // listicle
```

### A hub is not optional in practice

Without one, your spoke URLs are orphans — nothing on your site links to
them. Google may still find them via the sitemap, but PageRank can't flow to
them and they tend to under-rank. Hub-and-spoke is the consensus pSEO
internal-linking pattern. If you truly can't ship a hub, route equivalent
crawl signal from somewhere else (a blog post, a footer, an existing index).

### Schema.org type cheatsheet

| Collection style           | Schema type                             |
| -------------------------- | --------------------------------------- |
| Comparison / listicle      | `ItemList`                              |
| Product / SaaS catalog     | `Product` or `SoftwareApplication`      |
| Local business / directory | `LocalBusiness` (with `address`, `geo`) |
| Recipe / how-to            | `Recipe` / `HowTo`                      |
| Q&A / glossary             | `FAQPage` / `DefinedTerm`               |
| Article / guide            | `Article` (datePublished, headline, …)  |
| Hub page                   | `CollectionPage` or `ItemList`          |

### Meta tips that matter at scale

- **Titles MUST be unique across items.** "Best Coffee" repeated 50 times is
  a thin-content signal. Always interpolate the entity:
  `Best Coffee in ${city.name}`.
- **Descriptions ~150-160 chars.** Mention the entity AND a number
  ("12 spots") — it helps CTR.
- **`canonical`** should be the page's own absolute URL (or path).
- **`image`** becomes og:image — use a 1200×630 png/jpg.
- **`ogType`** defaults to `'website'`; use `'article'` for editorial.

---

## Cache versioning — what happens, when

Three things can invalidate a cached pSEO URL. They're nested by scope:

| Action                                | Effect                                                            |
| ------------------------------------- | ----------------------------------------------------------------- |
| Bump `version` in the collection file | Every URL in that collection invalidates on the next request.     |
| Change a row's `itemVersion` source   | Only that one URL invalidates. Siblings stay warm.                |
| Code deploy (no `version` bump)       | Nothing in scoped routes invalidates. Pages keep serving from R2. |

This is a deliberate departure from the default behavior of the rest of the
site — non-pSEO routes still bust on every deploy via the build-time
`CACHE_VERSION`. pSEO opts out so a 50k-page surface doesn't get re-rendered
for a config change. **The trade-off:** if you change the page Component but
forget to bump `version`, the new code won't appear for cached URLs. That's
intentional — bump `version` whenever the template or data semantics change.

To force a full pSEO refresh: bump `version` in every collection file. To
force a single URL refresh: change the row's `itemVersion` source.

---

## Common patterns to get you started

The doc-comment block at the top of
[`app/pseo/collections/best-coffee.ts`](app/pseo/collections/best-coffee.ts) shows
sketches for several collection shapes — apartment listings, app comparisons,
template galleries — copy whichever resembles what you're building.

---

## Pitfalls

- **Title duplication.** If two items end up with the same `<title>`, Google
  treats them as near-duplicates and may drop one from the index. Always
  interpolate a unique entity (e.g. `${item.name}`) into the title.
- **Indexing thin pages.** The single biggest 2026 pSEO risk. Use
  `indexable()` to gate URLs that don't yet have enough content. Don't ship
  with `indexable` omitted unless every item really is rich.
- **Unbounded growth.** A pair-wise comparison collection with N inputs has
  `N*(N-1)/2` URLs. 100 apps → 4950 URLs. Plan accordingly (and make sure
  your sitemap doesn't blow past 50k — chunking is automatic, but the
  sitemap index sees the chunks).
- **Forgetting to register.** You don't have to register anything — the file
  in `app/pseo/collections/` is auto-discovered. If a route doesn't appear,
  check that the file exports the definition as `default` and lives in the
  right folder.
- **Stale cache after a Component change.** Bump the collection's `version`
  — pSEO routes don't bust on code deploy by design.

---

## Where things live

```
libs/pseo/
  types.ts                  ← Pseo.Definition / Pseo.Item / Pseo.Hub
  discover-collection.ts    ← auto-discovery glob
  register.ts               ← wires collections into the router + sitemap

app/pseo/
  collections/              ← YOUR collection definition files go here
  pages/                    ← YOUR hub + item Component files go here

libs/sitemap.ts             ← contributor registry, sitemap.xml/robots.txt builders
worker/r2-cache.ts          ← per-route cache version override
worker/render.tsx           ← render flow that evaluates meta/jsonLd/indexable/cacheScope
app/document.tsx            ← <DocumentHead> emits the SEO tags
app/components/json-ld.tsx  ← <script type="application/ld+json"> wrapper
```
