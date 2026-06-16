import _ from 'lodash';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import context from '@/worker/context';
import ContextStorage from '@/worker/context-storage';
import createRouter from '@/libs/router';
import type { Pseo } from '@/libs/pseo/types';
import type { Route } from '@/libs/router';
import {
	__resetForTests as resetSitemap,
	getContributors
} from '@/libs/sitemap';
import registerCollections, {
	buildItemCacheVersion,
	buildItemPath,
	registerCollection
} from '@/libs/pseo/register';

type City = {
	name: string;
	placesCount: number;
	slug: string;
	updatedAt: string;
};

const HubComponent: Route.PageComponent = () => {
	return null;
};

const ItemComponent: Route.PageComponent = () => {
	return null;
};

const NotFoundComponent: Route.PageComponent = () => {
	return null;
};

const pages: Record<string, Route.PageComponent> = {
	'best-coffee-hub': HubComponent,
	'best-coffee-item': ItemComponent,
	'not-found': NotFoundComponent
};

const buildCities = (): City[] => {
	return [
		{
			name: 'Lisbon',
			placesCount: 12,
			slug: 'lisbon',
			updatedAt: '2026-04-21'
		},
		{
			name: 'Porto',
			placesCount: 8,
			slug: 'porto',
			updatedAt: '2026-04-29'
		},
		{
			name: 'Coimbra',
			placesCount: 1,
			slug: 'coimbra',
			updatedAt: '2026-05-02'
		}
	];
};

const buildDefinition = (): Pseo.Definition<City> => {
	return {
		hub: {
			Component: HubComponent,
			meta: ({ items }) => {
				return {
					canonical: '/best-coffee',
					title: `Hub (${_.size(items)})`
				};
			},
			path: '/best-coffee'
		},
		item: {
			Component: ItemComponent,
			indexable: ({ item }) => {
				return item.placesCount >= 5;
			},
			itemVersion: ({ item }) => {
				return item.updatedAt;
			},
			jsonLd: ({ item }) => {
				return { '@type': 'ItemList', name: item.name };
			},
			key: 'slug',
			list: () => {
				return buildCities();
			},
			meta: ({ item }) => {
				return {
					canonical: `/best-coffee/${item.slug}`,
					title: `Best Coffee in ${item.name}`
				};
			},
			path: '/best-coffee/:slug'
		},
		name: 'best-coffee',
		version: '2026-05-02'
	};
};

const inContext = <T>(
	pathParams: Record<string, unknown>,
	fn: () => Promise<T> | T
): Promise<T> => {
	const req = new Request('https://example.com/');
	return context.run(new ContextStorage({ request: req }), () => {
		context.store.setPathParams(pathParams);
		return Promise.resolve(fn());
	});
};

describe('@/libs/pseo/register', () => {
	describe('buildItemCacheVersion', () => {
		it('should include only c/<name>/<version> when itemVersion is null', () => {
			expect(
				buildItemCacheVersion('best-coffee', '2026-05-02', null)
			).toEqual('c/best-coffee/2026-05-02');
		});

		it('should append /i:<itemVersion> when provided', () => {
			expect(
				buildItemCacheVersion('best-coffee', '2026-05-02', '2026-04-21')
			).toEqual('c/best-coffee/2026-05-02/i:2026-04-21');
		});
	});

	describe('buildItemPath', () => {
		it('should substitute the keyed param into the path template', () => {
			expect(
				buildItemPath('/x/:slug', { slug: 'lisbon' }, 'slug')
			).toEqual('/x/lisbon');
		});

		it('should fall back to empty string when the key is missing', () => {
			const item: { slug?: string } = {};

			expect(buildItemPath('/x/:slug', item, 'slug')).toEqual('/x/');
		});
	});

	describe('registerCollection', () => {
		beforeEach(() => {
			resetSitemap();
		});

		afterEach(() => {
			resetSitemap();
		});

		it('should register the item route on the router', () => {
			const router = createRouter(pages).notFound({
				Component: NotFoundComponent
			});
			registerCollection(router, buildDefinition());

			const match = router.match('/best-coffee/lisbon');

			expect(match.Component).toBe(ItemComponent);
			expect(match.pathParams).toEqual({ slug: 'lisbon' });
		});

		it('should register the hub route on the router when provided', () => {
			const router = createRouter(pages).notFound({
				Component: NotFoundComponent
			});
			registerCollection(router, buildDefinition());

			const match = router.match('/best-coffee');

			expect(match.Component).toBe(HubComponent);
		});

		it('should register a sitemap contributor with the collection name', () => {
			const router = createRouter(pages).notFound({
				Component: NotFoundComponent
			});
			registerCollection(router, buildDefinition());

			expect(
				_.map(getContributors(), c => {
					return c.name;
				})
			).toEqual(['best-coffee']);
		});
	});

	describe('registerCollections', () => {
		beforeEach(() => {
			resetSitemap();
		});

		afterEach(() => {
			resetSitemap();
		});

		it('should register an item route that resolves :slug against list()', async () => {
			const router = createRouter(pages).notFound({
				Component: NotFoundComponent
			});
			registerCollections(router, [buildDefinition()]);

			const match = router.match('/best-coffee/lisbon');

			expect(match.Component).toBe(ItemComponent);
			expect(match.pathParams).toEqual({ slug: 'lisbon' });

			const data = await inContext({ slug: 'lisbon' }, () => {
				return match.loader!();
			});

			expect(data).toMatchObject({ name: 'Lisbon', slug: 'lisbon' });
		});

		it('should expose meta/jsonLd/indexable that derive from the loaded item', async () => {
			const router = createRouter(pages).notFound({
				Component: NotFoundComponent
			});
			registerCollections(router, [buildDefinition()]);
			const match = router.match('/best-coffee/lisbon');

			const data = await inContext({ slug: 'lisbon' }, () => {
				return match.loader!();
			});

			await inContext({ slug: 'lisbon' }, () => {
				expect(match.meta!(data)).toEqual({
					canonical: '/best-coffee/lisbon',
					title: 'Best Coffee in Lisbon'
				});
				expect(match.jsonLd!(data)).toEqual({
					'@type': 'ItemList',
					name: 'Lisbon'
				});
				expect(match.indexable!(data)).toEqual(true);
			});
		});

		it('should mark items below the indexable threshold as noindex', async () => {
			const router = createRouter(pages).notFound({
				Component: NotFoundComponent
			});
			registerCollections(router, [buildDefinition()]);
			const match = router.match('/best-coffee/coimbra');

			const data = await inContext({ slug: 'coimbra' }, () => {
				return match.loader!();
			});

			await inContext({ slug: 'coimbra' }, () => {
				expect(match.indexable!(data)).toEqual(false);
			});
		});

		it('should synthesize cacheScope as c/<name>/<version>/i:<itemVersion>', async () => {
			const router = createRouter(pages).notFound({
				Component: NotFoundComponent
			});
			registerCollections(router, [buildDefinition()]);
			const match = router.match('/best-coffee/lisbon');

			const data = await inContext({ slug: 'lisbon' }, () => {
				return match.loader!();
			});

			const scope = await inContext({ slug: 'lisbon' }, () => {
				return match.cacheScope!(data);
			});

			expect(scope).toEqual('c/best-coffee/2026-05-02/i:2026-04-21');
		});

		it('should return null cacheScope when the loader returned null (item not found)', async () => {
			const router = createRouter(pages).notFound({
				Component: NotFoundComponent
			});
			registerCollections(router, [buildDefinition()]);
			const match = router.match('/best-coffee/missing');

			const data = await inContext({ slug: 'missing' }, () => {
				return match.loader!();
			});

			expect(data).toEqual(null);

			const scope = await inContext({ slug: 'missing' }, () => {
				return match.cacheScope!(data);
			});

			expect(scope).toEqual(null);
		});

		it('should register a hub route that loads the full list', async () => {
			const router = createRouter(pages).notFound({
				Component: NotFoundComponent
			});
			registerCollections(router, [buildDefinition()]);
			const match = router.match('/best-coffee');

			const data = await inContext({}, () => {
				return match.loader!();
			});

			expect(_.isArray(data)).toEqual(true);
			expect(_.size(data)).toEqual(3);

			expect(match.cacheScope!(data)).toEqual(
				'c/best-coffee/2026-05-02/__hub'
			);
		});

		it('should register a sitemap contributor with the collection name', () => {
			const router = createRouter(pages).notFound({
				Component: NotFoundComponent
			});
			registerCollections(router, [buildDefinition()]);
			const contributors = getContributors();

			expect(contributors).toHaveLength(1);
			expect(contributors[0].name).toEqual('best-coffee');
			expect(contributors[0].urlFor({ slug: 'lisbon' })).toEqual(
				'/best-coffee/lisbon'
			);
			expect(
				contributors[0].lastmod!({ updatedAt: '2026-04-21' })
			).toEqual('2026-04-21');
		});

		it('should default to "1" when version is omitted', async () => {
			const router = createRouter(pages).notFound({
				Component: NotFoundComponent
			});
			const definition: Pseo.Definition<City> = {
				hub: null,
				item: {
					Component: ItemComponent,
					key: 'slug',
					list: () => {
						return buildCities();
					},
					path: '/x/:slug'
				},
				name: 'x'
			};

			registerCollections(router, [definition]);
			const match = router.match('/x/lisbon');

			const data = await inContext({ slug: 'lisbon' }, () => {
				return match.loader!();
			});
			const scope = await inContext({ slug: 'lisbon' }, () => {
				return match.cacheScope!(data);
			});

			expect(scope).toEqual('c/x/1');
		});
	});
});
