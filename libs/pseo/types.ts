import type { Route } from '@/libs/router';

namespace Pseo {
	// Loader-time data passed to item-level meta / jsonLd / indexable /
	// itemVersion callbacks. `item` is the row that matched the URL;
	// `params` carries the path params (e.g. `{ slug }`).
	export type ItemContext<T = unknown> = {
		item: T;
		params: Record<string, unknown>;
	};

	// Loader-time data passed to hub-level meta / jsonLd callbacks.
	export type HubContext<T = unknown> = {
		items: T[];
	};

	export type Item<T = unknown> = {
		// React component rendered for each URL. Receives the matched item
		// via `data` (Route.PageProps); narrow with a type guard before use.
		Component: Route.PageComponent;

		// Quality gate. Returns false → page renders 200 OK with
		// `<meta robots="noindex,nofollow">` AND is excluded from sitemap.
		// Default: every item indexable. See "SEO playbook" in PSEO.md.
		indexable?: (ctx: ItemContext<T>) => boolean;

		// Per-item cache version segment (typically `item.updatedAt`).
		// When changed, only THAT URL invalidates. Omit for coarse-only
		// (per-collection `version`) invalidation.
		itemVersion?: (ctx: ItemContext<T>) => string | null;

		// schema.org JSON-LD payload. Single object or array. Emitted as
		// `<script type="application/ld+json">`. See PSEO.md for the
		// type cheatsheet (Product / LocalBusiness / FAQPage / …).
		jsonLd?: (ctx: ItemContext<T>) => unknown;

		// Item field used to resolve the URL's path param to a row in
		// `list()`. e.g. `key: 'slug'` + `path: '/x/:slug'` → finds the
		// item whose `slug` equals the URL's `:slug`. Typed against T.
		key: keyof T & string;

		// Returns the full collection. Sync or async. Called on every
		// request (the loader looks up the matching row), so keep it cheap
		// or front it with module-level caching.
		list: () => Promise<T[]> | T[];

		// Per-item meta — title (required), description, canonical, image
		// (becomes og:image), ogType (defaults to 'website'). The document
		// shell renders these inside <head> automatically.
		meta?: (ctx: ItemContext<T>) => Route.Meta | null;

		// URL pattern. The single path param must match `key`.
		// e.g. '/best-coffee/:slug', '/products/:id', '/from/:country'.
		path: string;
	};

	export type Hub<T = unknown> = {
		// React component rendered at the hub URL. Receives the full list
		// of items via `data`. Render a `<ul>` of `<a>` links so Googlebot
		// can crawl every spoke.
		Component: Route.PageComponent;

		// schema.org JSON-LD for the hub. Common types: CollectionPage,
		// ItemList, BreadcrumbList.
		jsonLd?: (ctx: HubContext<T>) => unknown;

		// Hub meta — same shape as Item.meta. Title typically references
		// the whole collection ("All cities", "Every product").
		meta?: (ctx: HubContext<T>) => Route.Meta | null;

		// Hub URL. Conventionally the collection root.
		// e.g. '/best-coffee' for items at '/best-coffee/:slug'.
		path: string;
	};

	export type Definition<T = unknown> = {
		// Hub page (or null). Strongly recommended — without one, every
		// item URL is a crawl orphan. See "SEO playbook" in PSEO.md.
		// Pass `null` explicitly when omitted — keeps the shape uniform.
		hub: Hub<T> | null;

		// The per-URL ("spoke") page configuration. Required.
		item: Item<T>;

		// Stable kebab-case identifier — appears in cache keys
		// (`pages/c/<name>/<version>/…`) and sitemap chunk URLs
		// (`/sitemap-<name>.xml`). Must be unique across all collections.
		name: string;

		// Bumping this string invalidates EVERY URL in the collection on
		// the next request — without a code deploy, without touching
		// unrelated caches. Default: '1'. See "Cache versioning" in PSEO.md.
		version?: string;
	};
}

export type { Pseo };
