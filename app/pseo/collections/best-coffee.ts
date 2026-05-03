import _ from 'lodash';

import bestCoffeeHub from '@/app/pseo/pages/best-coffee-hub';
import bestCoffeeItem from '@/app/pseo/pages/best-coffee-item';

import type { Pseo } from '@/libs/pseo/types';

// ─── pSEO collection — worked example ──────────────────────────────────────
//
// This file generates one URL per row in `cities` (so: /best-coffee/lisbon,
// /best-coffee/porto, /best-coffee/madrid, ...) plus a hub at /best-coffee.
// All SEO infrastructure (title, description, canonical, og:*, JSON-LD,
// sitemap inclusion, robots noindex) is wired up automatically from this one
// config. To add a new city: append to the array. To add a new collection:
// drop a new file in `app/pseo/collections/` — see the patterns below.
//
// ─── Other pSEO collection shapes (sample sketches) ────────────────────────
//
// (1) "Apartments in <city>" — marketplace, async data, FAQ rich result:
//
//     const definition: Pseo.Definition<Apartment> = {
//       name: 'apartments-by-city',
//       version: '1',
//       item: {
//         path: '/apartments/:city',
//         key:  'city',
//         list: async () => fetchListings(),                      // hits an API
//         indexable: ({ item }) => item.activeListings >= 25,     // hide thin cities
//         itemVersion: ({ item }) => item.lastIndexedAt,
//         meta: ({ item }) => ({
//           canonical: `/apartments/${item.city}`,
//           title:     `Apartments for rent in ${item.cityName} (${item.activeListings} listings)`,
//           description: `Browse ${item.activeListings} apartments in ${item.cityName}, from $${item.minPrice}/mo. Updated ${item.lastIndexedAt}.`
//         }),
//         jsonLd: ({ item }) => ({ '@type': 'FAQPage', mainEntity: item.faqs }),
//         Component: ApartmentCityPage
//       },
//       hub: { path: '/apartments', Component: ApartmentHubPage }
//     };
//
// (2) "<App A> vs <App B>" — comparison table, derived from one source list:
//
//     const definition: Pseo.Definition<Pair> = {
//       name: 'app-comparisons',
//       version: '2026-05',
//       item: {
//         path: '/compare/:slug',                          // e.g. /compare/notion-vs-coda
//         key:  'slug',
//         list: () => buildPairs(apps),                    // n*(n-1)/2 pairs
//         meta: ({ item }) => ({
//           canonical: `/compare/${item.slug}`,
//           title:     `${item.a.name} vs ${item.b.name}: a side-by-side comparison`
//         }),
//         jsonLd: ({ item }) => ({
//           '@type': 'ItemList',
//           name:    `${item.a.name} vs ${item.b.name}`,
//           itemListElement: [
//             { '@type': 'SoftwareApplication', name: item.a.name },
//             { '@type': 'SoftwareApplication', name: item.b.name }
//           ]
//         }),
//         Component: ComparisonPage
//       }
//       // hub omitted — comparisons live under a different content hub.
//     };
//
// (3) "Templates for <job>" — Notion-style, mostly-static content:
//
//     const definition: Pseo.Definition<Job> = {
//       name: 'templates-by-job',
//       item: {
//         path: '/templates/:job',
//         key:  'job',
//         list: () => jobs,
//         meta: ({ item }) => ({
//           canonical: `/templates/${item.job}`,
//           title:     `${item.title} templates — free starter docs`
//         }),
//         Component: TemplatesPage
//       },
//       hub: {
//         path: '/templates',
//         Component: TemplatesHub,
//         meta: () => ({ canonical: '/templates', title: 'Templates for every workflow' })
//       }
//     };
//
// ─── The actual collection: best coffee, by city ───────────────────────────

type City = {
	heroImage?: string;
	name: string;
	picks: { description: string; name: string }[];
	placesCount: number;
	slug: string;
	updatedAt: string;
};

const isCity = (value: unknown): value is City => {
	return (
		_.isObject(value) &&
		!_.isNull(value) &&
		'slug' in value &&
		'name' in value
	);
};

const isCityList = (value: unknown): value is City[] => {
	return _.isArray(value);
};

// Demo dataset. In a real app, replace this with whatever you want — fetch
// from a CMS, R2, DynamoDB, an API, glob a folder of JSON files. The only
// requirement: `list()` returns an array of T.
const cities: City[] = [
	{
		name: 'Lisbon',
		picks: [
			{
				description:
					'A tiny espresso bar with a sourdough croissant that disappears by 10am.',
				name: 'Fábrica Coffee Roasters'
			},
			{
				description:
					'Sun-soaked tables in Príncipe Real, a single-origin pour-over board, and the best almond pastry in the city.',
				name: 'Hello, Kristof'
			},
			{
				description:
					'A specialty roaster tucked into LX Factory; long benches, free wifi, and a lemon poppy loaf worth detouring for.',
				name: 'Wish Slow Coffee House'
			}
		],
		placesCount: 12,
		slug: 'lisbon',
		updatedAt: '2026-04-21'
	},
	{
		name: 'Porto',
		picks: [
			{
				description:
					'A Kyoto-influenced cafe in Cedofeita; matcha lattes, fermented juice flights, and a serious focus on water.',
				name: '7g Roaster'
			},
			{
				description:
					'Tucked in Bonfim, a neighborhood roaster pulling beautiful espressos and brewing the best filter in town.',
				name: 'Combi Coffee'
			}
		],
		placesCount: 8,
		slug: 'porto',
		updatedAt: '2026-04-29'
	},
	{
		name: 'Madrid',
		picks: [
			{
				description:
					'A specialty bar in Conde Duque with a serious bean program and a permanent line at lunch.',
				name: 'HanSo Café'
			},
			{
				description:
					'Australian-style flat whites, banana bread, and the most reliable wifi in Malasaña.',
				name: 'Toma Café 1'
			},
			{
				description:
					'A rotating guest roaster bar inside a corner bookshop; the V60 is the move.',
				name: 'Ruda Café'
			}
		],
		placesCount: 15,
		slug: 'madrid',
		updatedAt: '2026-05-01'
	},
	// Demo "thin" entry to show the indexable gate excluding it from the
	// sitemap and emitting <meta robots="noindex">. Bump placesCount to 5+
	// to flip it indexable without touching anything else.
	{
		name: 'Coimbra',
		picks: [],
		placesCount: 1,
		slug: 'coimbra',
		updatedAt: '2026-05-02'
	}
];

const definition: Pseo.Definition<City> = {
	// ─── Hub page (`/best-coffee`) ──────────────────────────────────────────
	// Optional but strongly recommended. The hub is what gives Googlebot a
	// crawl path into every spoke and lets you run a hub-and-spoke internal
	// linking pattern. Skip the hub only if you have another high-authority
	// page you'll link from.
	hub: {
		// React component rendered at `path`. Receives the full list of items
		// via `data` (Route.PageProps). Render a simple `<ul>` of `<a>` links
		// to each spoke — that's the hub-and-spoke crawl signal.
		Component: bestCoffeeHub,

		// Schema.org JSON-LD emitted as <script type="application/ld+json">
		// inside <head>. CollectionPage is the right type for hub-style
		// listing pages.
		jsonLd: ({ items }) => {
			return {
				'@context': 'https://schema.org',
				'@type': 'CollectionPage',
				name: 'Best Coffee — every city',
				numberOfItems: _.size(items)
			};
		},

		// Per-page meta tags: title, description, canonical, og:*. The
		// document shell (<DocumentHead>) renders all of this automatically
		// based on what you return here.
		meta: ({ items }) => {
			return {
				canonical: '/best-coffee',
				description: `${_.size(items)} city coffee guides — independent picks, updated regularly.`,
				title: 'Best Coffee — every city'
			};
		},

		// The hub URL. Conventionally the collection root.
		path: '/best-coffee'
	},

	// ─── Item page (each spoke — `/best-coffee/:slug`) ──────────────────────
	item: {
		// React component rendered for each URL. Receives the matched item
		// via `data` (Route.PageProps). Narrow the unknown `data` with a
		// type guard inside the component before rendering.
		Component: bestCoffeeItem,

		// Quality gate. Returns false → page renders normally but with
		// <meta robots="noindex,nofollow"> AND the URL is excluded from
		// sitemap.xml. Use this to keep "thin" pages out of Google's index
		// without 404'ing them — they can become indexable later when the
		// underlying data fills out.
		indexable: ({ item }) => {
			return item.placesCount >= 5;
		},

		// Per-item cache version segment. When this string changes, only
		// THAT URL invalidates — sibling items in the collection stay warm.
		// `item.updatedAt` is the natural source. Omit if your data has no
		// per-row timestamp; the per-collection `version` (below) still
		// covers coarse invalidation.
		itemVersion: ({ item }) => {
			return item.updatedAt;
		},

		// Per-item schema.org JSON-LD. Common collection types: ItemList,
		// Product, LocalBusiness, FAQPage, HowTo, Article. Match the type
		// to what the page is actually showing.
		jsonLd: ({ item }) => {
			return {
				'@context': 'https://schema.org',
				'@type': 'ItemList',
				dateModified: item.updatedAt,
				name: `Best Coffee in ${item.name}`,
				numberOfItems: item.placesCount
			};
		},

		// Item field used to resolve `:slug` in the path against `list()`.
		// Typed against City, so TypeScript catches typos.
		key: 'slug',

		// Returns every item in the collection. Sync or async. Called on
		// every request — the loader looks up the matching row by `key`.
		// Cache results at the module level if list() is expensive.
		list: () => {
			return cities;
		},

		// Per-item meta: title, description, canonical, image (og:image),
		// ogType. Each property is optional except title.
		// Pro tip: keep titles unique per item — duplicate titles across
		// thousands of pSEO URLs get flagged as low-value.
		meta: ({ item }) => {
			return {
				canonical: `/best-coffee/${item.slug}`,
				description: `${item.placesCount} hand-picked coffee shops in ${item.name}. Refreshed ${item.updatedAt}.`,
				image: item.heroImage,
				title: `Best Coffee in ${item.name} (${item.placesCount} spots)`
			};
		},

		// URL pattern. The single path param must match `key` above.
		path: '/best-coffee/:slug'
	},

	// Stable identifier. Appears in the R2 cache key
	// (`pages/c/best-coffee/.../...`) and as `/sitemap-best-coffee.xml`.
	// Must be unique across all registered collections.
	name: 'best-coffee',

	// Bumping `version` invalidates EVERY URL in this collection on next
	// request. Code deploys do NOT bust this collection's cache — the only
	// way to invalidate is to bump `version` here (coarse) or change an
	// item's `itemVersion` (fine).
	// When to bump: template Component changed shape, dataset semantics
	// shifted, JSON-LD/meta logic changed meaningfully.
	version: '2026-05-02'
};

export { isCity, isCityList };
export type { City };
export default definition;
