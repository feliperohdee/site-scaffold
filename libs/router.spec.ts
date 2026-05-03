import { afterEach, describe, expect, it, vi } from 'vitest';

import createRouter, { Route } from '@/libs/router';
import pages from '@/libs/pages';
import { clientOnly } from '@/libs/client-only';

describe('@/libs/router', () => {
	describe('add', () => {
		afterEach(() => {
			vi.unstubAllEnvs();
		});

		it('should be chainable', () => {
			const router = createRouter(pages).notFound({
				Component: pages['not-found']
			});
			const result = router.add('/', { Component: pages.home });

			expect(result).toBe(router);
		});

		it('should throw in dev when registering a Component that is not in the pages map', () => {
			const Unregistered: Route.PageComponent = () => {
				return null;
			};
			const router = createRouter(pages).notFound({
				Component: pages['not-found']
			});

			try {
				router.add('/x', { Component: Unregistered });

				throw new Error('expected to throw');
			} catch (err) {
				expect((err as Error).message).toContain(
					"Route '/x' uses a component that is not registered in the pages map"
				);
			}
		});

		it('should NOT throw in non-dev when registering a Component that is not in the pages map', () => {
			vi.stubEnv('DEV', false);

			const Unregistered: Route.PageComponent = () => {
				return null;
			};
			const router = createRouter(pages).notFound({
				Component: pages['not-found']
			});
			const result = router.add('/x', { Component: Unregistered });

			expect(result).toBe(router);
		});
	});

	describe('match', () => {
		afterEach(() => {
			vi.unstubAllEnvs();
		});

		it('should throw when match() is called before notFound() is configured', () => {
			const router = createRouter(pages);

			try {
				router.match('/no-such-path');

				throw new Error('expected to throw');
			} catch (err) {
				expect((err as Error).message).toContain(
					'Router has no notFound handler'
				);
			}
		});

		it('should fall back to NotFound for unmatched paths with full MatchResult shape when no meta is provided', () => {
			const router = createRouter(pages).notFound({
				Component: pages['not-found']
			});
			const result = router.match('/no-such-path');

			expect(result.Component).toBe(pages['not-found']);
			expect(result.cache).toEqual(true);
			expect(result.cacheScope).toEqual(null);
			expect(result.jsonLd).toEqual(null);
			expect(result.loader).toEqual(null);
			expect(result.meta).toEqual(null);
			expect(result.page).toEqual('not-found');
			expect(result.pathParams).toEqual({});
			expect(result.indexable!(null)).toEqual(false);
		});

		it('should expose the meta thunk for the not-found fallback when notFound() handler provides one', () => {
			const router = createRouter(pages).notFound({
				Component: pages['not-found'],
				meta: () => {
					return { title: 'Not found — Site' };
				}
			});
			const result = router.match('/no-such-path');

			expect(result.meta!(null)).toEqual({
				title: 'Not found — Site'
			});
		});

		it('should throw in dev when a client-only component is registered as a page', () => {
			const ClientOnlyComponent = clientOnly(pages.home);
			const clientOnlyPages = {
				...pages,
				home: ClientOnlyComponent
			};
			const router = createRouter(clientOnlyPages)
				.notFound({ Component: pages['not-found'] })
				.add('/', { Component: ClientOnlyComponent });

			try {
				router.match('/');

				throw new Error('expected to throw');
			} catch (err) {
				expect((err as Error).message).toContain(
					"Route '/' uses a client-only component as its page"
				);
			}
		});

		it('should fall back to NotFound in non-dev when a client-only component is registered as a page', () => {
			vi.stubEnv('DEV', false);

			const ClientOnlyComponent = clientOnly(pages.home);
			const clientOnlyPages = {
				...pages,
				home: ClientOnlyComponent
			};
			const router = createRouter(clientOnlyPages)
				.notFound({ Component: pages['not-found'] })
				.add('/', { Component: ClientOnlyComponent });
			const result = router.match('/');

			expect(result.Component).toBe(pages['not-found']);
		});

		it('should populate MatchResult with handler defaults when fields are omitted', () => {
			const router = createRouter(pages)
				.notFound({ Component: pages['not-found'] })
				.add('/', { Component: pages.home });
			const result = router.match('/');

			expect(result.cache).toEqual(true);
			expect(result.cacheScope).toEqual(null);
			expect(result.indexable).toEqual(null);
			expect(result.jsonLd).toEqual(null);
			expect(result.loader).toEqual(null);
			expect(result.meta).toEqual(null);
		});

		it('should propagate every handler field to MatchResult when declared', () => {
			const cacheScope = vi.fn();
			const indexable = vi.fn();
			const jsonLd = vi.fn();
			const loader: Route.Loader = vi.fn();
			const meta = vi.fn();
			const router = createRouter(pages)
				.notFound({ Component: pages['not-found'] })
				.add('/articles/:slug', {
					cache: false,
					cacheScope,
					Component: pages.article,
					indexable,
					jsonLd,
					loader,
					meta
				});
			const result = router.match('/articles/x');

			expect(result.cache).toEqual(false);
			expect(result.cacheScope).toBe(cacheScope);
			expect(result.indexable).toBe(indexable);
			expect(result.jsonLd).toBe(jsonLd);
			expect(result.loader).toBe(loader);
			expect(result.meta).toBe(meta);
		});

		it('should return the matched component for a registered path', () => {
			const router = createRouter(pages)
				.notFound({ Component: pages['not-found'] })
				.add('/', { Component: pages.home });
			const result = router.match('/');

			expect(result.Component).toBe(pages.home);
		});

		it('should derive page from the Component via reverse-lookup in the pages map', () => {
			const router = createRouter(pages)
				.notFound({ Component: pages['not-found'] })
				.add('/', { Component: pages.home })
				.add('/articles/:slug', { Component: pages.article });

			expect(router.match('/').page).toEqual('home');
			expect(router.match('/articles/x').page).toEqual('article');
		});

		it('should extract pathParams from a parametrized path', () => {
			const router = createRouter(pages)
				.notFound({ Component: pages['not-found'] })
				.add('/articles/:slug', { Component: pages.article });
			const result = router.match('/articles/hello-world');

			expect(result.pathParams).toEqual({ slug: 'hello-world' });
		});

		it('should match the first registered route when multiple match', () => {
			const router = createRouter(pages)
				.notFound({ Component: pages['not-found'] })
				.add('/articles', { Component: pages.articles })
				.add('/:slug', { Component: pages.slug });
			const articles = router.match('/articles');
			const slug = router.match('/whatever');

			expect(articles.Component).toBe(pages.articles);
			expect(articles.page).toEqual('articles');
			expect(slug.Component).toBe(pages.slug);
			expect(slug.page).toEqual('slug');
			expect(slug.pathParams).toEqual({ slug: 'whatever' });
		});
	});

	describe('notFound', () => {
		afterEach(() => {
			vi.unstubAllEnvs();
		});

		it('should be chainable', () => {
			const router = createRouter(pages);
			const result = router.notFound({ Component: pages['not-found'] });

			expect(result).toBe(router);
		});

		it('should throw in dev when notFound() is given a component not in the pages map', () => {
			const Unregistered: Route.PageComponent = () => {
				return null;
			};
			const router = createRouter(pages);

			try {
				router.notFound({ Component: Unregistered });

				throw new Error('expected to throw');
			} catch (err) {
				expect((err as Error).message).toContain(
					'notFound() uses a component that is not registered in the pages map'
				);
			}
		});
	});
});
