import { describe, expect, it, vi } from 'vitest';

import createRouter, { Route } from '@/app/libs/router';

const HomeComponent: Route.PageComponent = () => {
	return null;
};

const ArticleComponent: Route.PageComponent = () => {
	return null;
};

const NotFoundComponent: Route.PageComponent = () => {
	return null;
};

describe('@/app/libs/router', () => {
	describe('createRouter', () => {
		describe('add', () => {
			it('should be chainable', () => {
				const router = createRouter(NotFoundComponent);
				const result = router.add('/', { Component: HomeComponent });

				expect(result).toBe(router);
			});
		});

		describe('match', () => {
			it('should fall back to the notFound component for unmatched paths', () => {
				const router = createRouter(NotFoundComponent);
				const result = router.match('/no-such-path');

				expect(result.Component).toBe(NotFoundComponent);
				expect(result.loader).toEqual(null);
				expect(result.cache).toEqual(true);
				expect(result.pathParams).toEqual({});
			});

			it('should default cache to true when not specified', () => {
				const router = createRouter(NotFoundComponent).add('/', {
					Component: HomeComponent
				});
				const result = router.match('/');

				expect(result.cache).toEqual(true);
			});

			it('should respect cache: false on the handler', () => {
				const router = createRouter(NotFoundComponent).add('/me', {
					cache: false,
					Component: HomeComponent
				});
				const result = router.match('/me');

				expect(result.cache).toEqual(false);
			});

			it('should return the matched component for a registered path', () => {
				const router = createRouter(NotFoundComponent).add('/', {
					Component: HomeComponent
				});
				const result = router.match('/');

				expect(result.Component).toBe(HomeComponent);
			});

			it('should expose the loader for routes that declare one', () => {
				const loader: Route.Loader = vi.fn();
				const router = createRouter(NotFoundComponent).add(
					'/articles/:slug',
					{ Component: ArticleComponent, loader }
				);
				const result = router.match('/articles/x');

				expect(result.loader).toBe(loader);
			});

			it('should expose null loader for routes without one', () => {
				const router = createRouter(NotFoundComponent).add('/', {
					Component: HomeComponent
				});
				const result = router.match('/');

				expect(result.loader).toEqual(null);
			});

			it('should extract pathParams from a parametrized path', () => {
				const router = createRouter(NotFoundComponent).add(
					'/articles/:slug',
					{ Component: ArticleComponent }
				);
				const result = router.match('/articles/hello-world');

				expect(result.pathParams).toEqual({ slug: 'hello-world' });
			});

			it('should match the first registered route when multiple match', () => {
				const router = createRouter(NotFoundComponent)
					.add('/articles', { Component: ArticleComponent })
					.add('/:slug', { Component: HomeComponent });
				const articles = router.match('/articles');
				const slug = router.match('/whatever');

				expect(articles.Component).toBe(ArticleComponent);
				expect(slug.Component).toBe(HomeComponent);
				expect(slug.pathParams).toEqual({ slug: 'whatever' });
			});
		});
	});
});
