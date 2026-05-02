import { afterEach, describe, expect, it, vi } from 'vitest';

import createRouter, { Route } from '@/libs/router';
import { clientOnly } from '@/libs/client-only';

const HomeComponent: Route.PageComponent = () => {
	return null;
};

const ArticleComponent: Route.PageComponent = () => {
	return null;
};

const ArticlesComponent: Route.PageComponent = () => {
	return null;
};

const SlugComponent: Route.PageComponent = () => {
	return null;
};

const NotFoundComponent: Route.PageComponent = () => {
	return null;
};

const pages: Record<string, Route.PageComponent> = {
	article: ArticleComponent,
	articles: ArticlesComponent,
	home: HomeComponent,
	'not-found': NotFoundComponent,
	slug: SlugComponent
};

describe('@/libs/router', () => {
	describe('createRouter', () => {
		it('should throw if the pages map does not contain the notFoundPage entry', () => {
			try {
				createRouter('missing', pages);

				throw new Error('expected to throw');
			} catch (err) {
				expect((err as Error).message).toContain(
					"Pages map is missing the notFoundPage entry: 'missing'"
				);
			}
		});

		describe('add', () => {
			it('should be chainable', () => {
				const router = createRouter('not-found', pages);
				const result = router.add('/', { Component: HomeComponent });

				expect(result).toBe(router);
			});

			it('should throw in dev when registering a Component that is not in the pages map', () => {
				const Unregistered: Route.PageComponent = () => {
					return null;
				};
				const router = createRouter('not-found', pages);

				try {
					router.add('/x', { Component: Unregistered });

					throw new Error('expected to throw');
				} catch (err) {
					expect((err as Error).message).toContain(
						"Route '/x' uses a component that is not registered in the pages map"
					);
				}
			});
		});

		describe('match', () => {
			it('should fall back to the notFound component and notFound page for unmatched paths', () => {
				const router = createRouter('not-found', pages);
				const result = router.match('/no-such-path');

				expect(result.Component).toBe(NotFoundComponent);
				expect(result.cache).toEqual(true);
				expect(result.loader).toEqual(null);
				expect(result.page).toEqual('not-found');
				expect(result.pathParams).toEqual({});
			});

			describe('client-only component as page', () => {
				afterEach(() => {
					vi.unstubAllEnvs();
				});

				it('should throw in dev when a client-only component is registered as a page', () => {
					const ClientOnlyComponent = clientOnly(HomeComponent);
					const clientOnlyPages = {
						...pages,
						home: ClientOnlyComponent
					};
					const router = createRouter(
						'not-found',
						clientOnlyPages
					).add('/', { Component: ClientOnlyComponent });

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

					const ClientOnlyComponent = clientOnly(HomeComponent);
					const clientOnlyPages = {
						...pages,
						home: ClientOnlyComponent
					};
					const router = createRouter(
						'not-found',
						clientOnlyPages
					).add('/', { Component: ClientOnlyComponent });
					const result = router.match('/');

					expect(result.Component).toBe(NotFoundComponent);
					expect(result.cache).toEqual(true);
					expect(result.loader).toEqual(null);
					expect(result.page).toEqual('not-found');
					expect(result.pathParams).toEqual({});
				});
			});

			it('should default cache to true when not specified', () => {
				const router = createRouter('not-found', pages).add('/', {
					Component: HomeComponent
				});
				const result = router.match('/');

				expect(result.cache).toEqual(true);
			});

			it('should respect cache: false on the handler', () => {
				const router = createRouter('not-found', pages).add('/me', {
					cache: false,
					Component: HomeComponent
				});
				const result = router.match('/me');

				expect(result.cache).toEqual(false);
			});

			it('should return the matched component for a registered path', () => {
				const router = createRouter('not-found', pages).add('/', {
					Component: HomeComponent
				});
				const result = router.match('/');

				expect(result.Component).toBe(HomeComponent);
			});

			it('should derive page from the Component via reverse-lookup in the pages map', () => {
				const router = createRouter('not-found', pages)
					.add('/', { Component: HomeComponent })
					.add('/articles/:slug', { Component: ArticleComponent });

				expect(router.match('/').page).toEqual('home');
				expect(router.match('/articles/x').page).toEqual('article');
			});

			it('should expose the loader for routes that declare one', () => {
				const loader: Route.Loader = vi.fn();
				const router = createRouter('not-found', pages).add(
					'/articles/:slug',
					{ Component: ArticleComponent, loader }
				);
				const result = router.match('/articles/x');

				expect(result.loader).toBe(loader);
			});

			it('should expose null loader for routes without one', () => {
				const router = createRouter('not-found', pages).add('/', {
					Component: HomeComponent
				});
				const result = router.match('/');

				expect(result.loader).toEqual(null);
			});

			it('should extract pathParams from a parametrized path', () => {
				const router = createRouter('not-found', pages).add(
					'/articles/:slug',
					{ Component: ArticleComponent }
				);
				const result = router.match('/articles/hello-world');

				expect(result.pathParams).toEqual({ slug: 'hello-world' });
			});

			it('should match the first registered route when multiple match', () => {
				const router = createRouter('not-found', pages)
					.add('/articles', { Component: ArticlesComponent })
					.add('/:slug', { Component: SlugComponent });
				const articles = router.match('/articles');
				const slug = router.match('/whatever');

				expect(articles.Component).toBe(ArticlesComponent);
				expect(articles.page).toEqual('articles');
				expect(slug.Component).toBe(SlugComponent);
				expect(slug.page).toEqual('slug');
				expect(slug.pathParams).toEqual({ slug: 'whatever' });
			});
		});
	});
});
