import _ from 'lodash';
import {
	afterEach,
	beforeEach,
	describe,
	expect,
	it,
	MockInstance,
	vi
} from 'vitest';

import context from '@/worker/context';
import ContextStorage from '@/worker/context-storage';
import R2Cache from '@/worker/r2-cache';
import type { Route } from '@/libs/router';
import renderHtml, {
	renderResolved,
	renderStream,
	renderWithCache,
	resolveRoute
} from '@/worker/render';

const { mockConstants, mockMatchRoute } = vi.hoisted(() => {
	return {
		mockConstants: { CACHE_ENABLED: false },
		mockMatchRoute: vi.fn()
	};
});

vi.mock('@/constants', async importOriginal => {
	const original = await importOriginal<typeof import('@/constants')>();

	return {
		...original,
		get CACHE_ENABLED() {
			return mockConstants.CACHE_ENABLED;
		}
	};
});

vi.mock('@/worker/routes', () => {
	return { default: mockMatchRoute };
});

const SCOPED_URL = 'https://example.com/scoped/keep';
const SCOPED_VERSION = 'scope/fixed';
const STUB_BODY_MARKER = 'stub-body-marker';
const STUB_NOT_FOUND_PAGE = 'stub-not-found';
const STUB_PAGE = 'stub-page';
const STUB_TITLE = 'Stub Page';

const StubComponent: Route.PageComponent = ({ data, pathParams }) => {
	return (
		<div data-testid={STUB_BODY_MARKER}>
			<span>{JSON.stringify({ data, pathParams })}</span>
		</div>
	);
};

const StubNotFoundComponent: Route.PageComponent = () => {
	return <div data-testid={STUB_NOT_FOUND_PAGE}>stub-not-found</div>;
};

const buildMatch = (
	overrides: Partial<Route.MatchResult> = {}
): Route.MatchResult => {
	const defaults: Route.MatchResult = {
		cache: true,
		cacheScope: null,
		Component: StubComponent,
		indexable: null,
		jsonLd: null,
		loader: null,
		meta: () => {
			return { title: STUB_TITLE };
		},
		notFound: false,
		page: STUB_PAGE,
		pathParams: {}
	};

	return { ...defaults, ...overrides };
};

const buildRequest = (url: string): Request => {
	return new Request(url);
};

const buildScopedMatch = (
	overrides: Partial<Route.MatchResult> = {}
): Route.MatchResult => {
	return buildMatch({
		cacheScope: () => {
			return SCOPED_VERSION;
		},
		loader: () => {
			return { v: 'fixed' };
		},
		...overrides
	});
};

const drainStream = async (
	stream: ReadableStream<Uint8Array>
): Promise<string> => {
	const text = await new Response(stream).text();

	return text;
};

const inContext = <T,>(
	req: Request,
	fn: (req: Request) => Promise<T>
): Promise<T> => {
	return context.run(new ContextStorage({ request: req }), () => {
		return fn(req);
	});
};

const readHydration = (body: string): Record<string, unknown> | null => {
	const match = body.match(
		/<script[^>]*id="__data"[^>]*type="application\/json"[^>]*>([\s\S]*?)<\/script>/
	);

	if (_.isNull(match)) {
		return null;
	}

	return JSON.parse(match[1]);
};

describe('@/worker/render', () => {
	beforeEach(() => {
		mockConstants.CACHE_ENABLED = false;
		mockMatchRoute.mockReset().mockReturnValue(buildMatch());
	});

	describe('renderHtml', () => {
		let matchSpy: MockInstance<R2Cache['match']>;
		let putSpy: MockInstance<R2Cache['put']>;

		beforeEach(() => {
			matchSpy = vi.spyOn(R2Cache.prototype, 'match');
			putSpy = vi.spyOn(R2Cache.prototype, 'put');
		});

		it('should bypass the cache and stream a fresh render in dev', async () => {
			const response = await inContext(
				buildRequest('https://example.com/'),
				renderHtml
			);
			const body = await response.text();

			expect(matchSpy).not.toHaveBeenCalled();
			expect(putSpy).not.toHaveBeenCalled();
			expect(body).toContain(STUB_BODY_MARKER);
			expect(response.headers.get('content-type')).toEqual(
				'text/html; charset=utf-8'
			);
		});

		it('should route through the R2 cache when CACHE_ENABLED is true', async () => {
			mockConstants.CACHE_ENABLED = true;
			matchSpy.mockResolvedValueOnce(null);
			putSpy.mockResolvedValue(undefined);

			await inContext(
				buildRequest('https://example.com/foo'),
				renderHtml
			);

			expect(matchSpy).toHaveBeenCalledWith('https://example.com/foo');
		});

		it('should respond with status 200 for routes that matched a registered handler', async () => {
			const response = await inContext(
				buildRequest('https://example.com/'),
				renderHtml
			);

			expect(response.status).toEqual(200);
		});

		it('should respond with status 404 when the matched route is the not-found fallback', async () => {
			mockMatchRoute.mockReturnValue(buildMatch({ notFound: true }));

			const response = await inContext(
				buildRequest('https://example.com/no-such-path'),
				renderHtml
			);

			expect(response.status).toEqual(404);
		});

		afterEach(() => {
			vi.restoreAllMocks();
		});
	});

	describe('renderResolved', () => {
		it('should embed the provided resolved data into the hydration meta', async () => {
			const route = buildMatch({ pathParams: { id: 'abc' } });
			const resolved: Route.Resolved = {
				data: { id: 'abc' },
				indexable: true,
				jsonLd: { '@type': 'Article' },
				meta: { title: STUB_TITLE }
			};

			const stream = await inContext(
				buildRequest('https://example.com/with-loader/abc'),
				() => {
					return renderResolved(
						route,
						resolved,
						new URLSearchParams('a=1')
					);
				}
			);
			const body = await drainStream(stream);

			expect(readHydration(body)).toMatchObject({
				data: { id: 'abc' },
				indexable: true,
				jsonLd: { '@type': 'Article' },
				meta: { title: STUB_TITLE },
				page: STUB_PAGE,
				pathParams: { id: 'abc' },
				searchParams: 'a=1'
			});
		});

		it('should render the route Component with the provided resolved data and route pathParams', async () => {
			const route = buildMatch({ pathParams: { id: 'abc' } });
			const resolved: Route.Resolved = {
				data: { id: 'abc' },
				indexable: true,
				jsonLd: null,
				meta: null
			};

			const stream = await inContext(
				buildRequest('https://example.com/with-loader/abc'),
				() => {
					return renderResolved(
						route,
						resolved,
						new URLSearchParams()
					);
				}
			);
			const body = await drainStream(stream);

			expect(body).toContain(STUB_BODY_MARKER);
			expect(body).toContain('"id":"abc"');
		});
	});

	describe('renderStream', () => {
		it('should render the matched route Component', async () => {
			const { stream } = await inContext(
				buildRequest('https://example.com/'),
				renderStream
			);
			const body = await drainStream(stream);

			expect(body).toContain(STUB_BODY_MARKER);
			expect(body).toContain(`<title>${STUB_TITLE}</title>`);
		});

		it('should propagate pathParams from the matched route into the rendered Component', async () => {
			mockMatchRoute.mockReturnValue(
				buildMatch({ pathParams: { id: 'abc' } })
			);

			const { stream } = await inContext(
				buildRequest('https://example.com/with-loader/abc'),
				renderStream
			);
			const body = await drainStream(stream);

			expect(body).toContain('"id":"abc"');
		});

		it('should render the not-found Component and propagate the not-found page identifier for unmatched routes', async () => {
			mockMatchRoute.mockReturnValue(
				buildMatch({
					Component: StubNotFoundComponent,
					indexable: () => {
						return false;
					},
					notFound: true,
					page: STUB_NOT_FOUND_PAGE
				})
			);

			const { route, stream } = await inContext(
				buildRequest('https://example.com/no-match'),
				renderStream
			);
			const body = await drainStream(stream);

			expect(route.notFound).toEqual(true);
			expect(body).toContain(STUB_NOT_FOUND_PAGE);
			expect(readHydration(body)).toMatchObject({
				data: null,
				indexable: false,
				page: STUB_NOT_FOUND_PAGE,
				pathParams: {},
				searchParams: ''
			});
		});

		it('should serialize searchParams into the hydration meta', async () => {
			const { stream } = await inContext(
				buildRequest('https://example.com/?a=1&b=hello+world'),
				renderStream
			);
			const body = await drainStream(stream);

			expect(readHydration(body)).toMatchObject({
				searchParams: 'a=1&b=hello+world'
			});
		});

		it('should produce HTML starting with <!DOCTYPE html>', async () => {
			const { stream } = await inContext(
				buildRequest('https://example.com/'),
				renderStream
			);
			const body = await drainStream(stream);

			expect(_.startsWith(body, '<!DOCTYPE html>')).toEqual(true);
		});

		it('should include the root mount node', async () => {
			const { stream } = await inContext(
				buildRequest('https://example.com/'),
				renderStream
			);
			const body = await drainStream(stream);

			expect(body).toContain('<div id="root">');
		});

		it('should include the bootstrap module script tag pointing at the client entry', async () => {
			const { stream } = await inContext(
				buildRequest('https://example.com/'),
				renderStream
			);
			const body = await drainStream(stream);
			const scriptMatch = body.match(
				/<script[^>]+src="(\/app\/index\.tsx|\/assets\/client\.js)"[^>]*><\/script>/
			);

			expect(scriptMatch).not.toEqual(null);
			expect(scriptMatch![0]).toContain('type="module"');
		});

		it('should embed a __data application/json script', async () => {
			const { stream } = await inContext(
				buildRequest('https://example.com/'),
				renderStream
			);
			const body = await drainStream(stream);

			expect(body).toMatch(
				/<script[^>]*id="__data"[^>]*type="application\/json"[^>]*>/
			);
		});

		it('should hoist <title> into <head>', async () => {
			const { stream } = await inContext(
				buildRequest('https://example.com/'),
				renderStream
			);
			const body = await drainStream(stream);

			expect(body).toMatch(
				new RegExp(
					`<head[^>]*>[\\s\\S]*<title>${STUB_TITLE}</title>[\\s\\S]*</head>`
				)
			);
		});
	});

	describe('renderWithCache', () => {
		let cache: R2Cache;
		let matchSpy: MockInstance<R2Cache['match']>;
		let putSpy: MockInstance<R2Cache['put']>;

		beforeEach(() => {
			cache = new R2Cache({ prefix: 'test-render-cache' });
			matchSpy = vi.spyOn(cache, 'match');
			putSpy = vi.spyOn(cache, 'put').mockResolvedValue(undefined);
		});

		it('should skip the cache entirely when the route declares cache: false', async () => {
			mockMatchRoute.mockReturnValue(buildMatch({ cache: false }));

			const response = await inContext(
				buildRequest('https://example.com/'),
				req => {
					return renderWithCache(req, cache);
				}
			);
			const body = await response.text();

			expect(matchSpy).not.toHaveBeenCalled();
			expect(putSpy).not.toHaveBeenCalled();
			expect(body).toContain(STUB_BODY_MARKER);
		});

		it('should bypass the cache and respond with status 404 when the matched route is the not-found fallback', async () => {
			mockMatchRoute.mockReturnValue(buildMatch({ notFound: true }));

			const response = await inContext(
				buildRequest('https://example.com/no-such-path'),
				req => {
					return renderWithCache(req, cache);
				}
			);

			expect(response.status).toEqual(404);
			expect(matchSpy).not.toHaveBeenCalled();
			expect(putSpy).not.toHaveBeenCalled();
		});

		it('should look up the cache by the full URL including query string', async () => {
			matchSpy.mockResolvedValueOnce(null);

			await inContext(
				buildRequest('https://example.com/foo?q=1'),
				req => {
					return renderWithCache(req, cache);
				}
			);

			expect(matchSpy).toHaveBeenCalledWith(
				'https://example.com/foo?q=1'
			);
		});

		it('should call cache.match with no version arg for non-scoped routes', async () => {
			matchSpy.mockResolvedValueOnce(null);

			await inContext(buildRequest('https://example.com/'), req => {
				return renderWithCache(req, cache);
			});

			expect(matchSpy).toHaveBeenCalledWith('https://example.com/');
		});

		it('should return the cached response without rendering or writing back', async () => {
			const cachedResponse = new Response('CACHED HTML', {
				headers: { 'content-type': 'text/html; charset=utf-8' }
			});

			matchSpy.mockResolvedValueOnce(cachedResponse);

			const response = await inContext(
				buildRequest('https://example.com/foo'),
				req => {
					return renderWithCache(req, cache);
				}
			);
			const body = await response.text();

			expect(body).toEqual('CACHED HTML');
			expect(putSpy).not.toHaveBeenCalled();
		});

		it('should write the rendered html to the cache via waitUntil on miss', async () => {
			matchSpy.mockResolvedValueOnce(null);

			const response = await inContext(
				buildRequest('https://example.com/foo'),
				req => {
					return renderWithCache(req, cache);
				}
			);

			await response.text();

			await vi.waitFor(() => {
				expect(putSpy).toHaveBeenCalledOnce();
			});

			const [cacheKey, cachedResponse] = putSpy.mock.calls[0];

			expect(cacheKey).toEqual('https://example.com/foo');
			expect(cachedResponse).toBeInstanceOf(Response);
			expect(cachedResponse.headers.get('content-type')).toEqual(
				'text/html; charset=utf-8'
			);
			expect(await cachedResponse.text()).toContain(STUB_BODY_MARKER);
		});

		it('should respond with content-type text/html; charset=utf-8 on miss', async () => {
			matchSpy.mockResolvedValueOnce(null);

			const response = await inContext(
				buildRequest('https://example.com/'),
				req => {
					return renderWithCache(req, cache);
				}
			);

			expect(response.headers.get('content-type')).toEqual(
				'text/html; charset=utf-8'
			);
		});

		it('should respond with cache-control public, max-age=300 on miss', async () => {
			matchSpy.mockResolvedValueOnce(null);

			const response = await inContext(
				buildRequest('https://example.com/'),
				req => {
					return renderWithCache(req, cache);
				}
			);

			expect(response.headers.get('cache-control')).toEqual(
				'public, max-age=300'
			);
		});

		it('should pass the synthesized version to cache.match for scoped routes', async () => {
			mockMatchRoute.mockReturnValue(buildScopedMatch());
			matchSpy.mockResolvedValueOnce(null);

			await inContext(buildRequest(SCOPED_URL), req => {
				return renderWithCache(req, cache);
			});

			expect(matchSpy).toHaveBeenCalledWith(SCOPED_URL, SCOPED_VERSION);
		});

		it('should HIT and skip rendering when the scoped cache has a match', async () => {
			mockMatchRoute.mockReturnValue(buildScopedMatch());

			const cachedResponse = new Response('CACHED ARTICLE', {
				headers: { 'content-type': 'text/html; charset=utf-8' }
			});

			matchSpy.mockResolvedValueOnce(cachedResponse);

			const response = await inContext(buildRequest(SCOPED_URL), req => {
				return renderWithCache(req, cache);
			});
			const body = await response.text();

			expect(body).toEqual('CACHED ARTICLE');
			expect(matchSpy).toHaveBeenCalledWith(SCOPED_URL, SCOPED_VERSION);
			expect(putSpy).not.toHaveBeenCalled();
		});

		it('should pass the synthesized version to cache.put on miss for scoped routes', async () => {
			mockMatchRoute.mockReturnValue(buildScopedMatch());
			matchSpy.mockResolvedValueOnce(null);

			const response = await inContext(buildRequest(SCOPED_URL), req => {
				return renderWithCache(req, cache);
			});

			await response.text();

			await vi.waitFor(() => {
				expect(putSpy).toHaveBeenCalledOnce();
			});

			const [cacheKey, , version] = putSpy.mock.calls[0];

			expect(cacheKey).toEqual(SCOPED_URL);
			expect(version).toEqual(SCOPED_VERSION);
		});

		afterEach(() => {
			vi.restoreAllMocks();
		});
	});

	describe('resolveRoute', () => {
		it('should call route.loader and use its result as data', async () => {
			const loader = vi.fn().mockResolvedValue({ id: 'x' });
			const route = buildMatch({ loader });

			const result = await resolveRoute(route);

			expect(loader).toHaveBeenCalled();
			expect(result.data).toEqual({ id: 'x' });
		});

		it('should propagate errors thrown by route.loader', async () => {
			const route = buildMatch({
				loader: () => {
					throw new Error('loader exploded');
				}
			});

			try {
				await resolveRoute(route);

				throw new Error('expected to throw');
			} catch (err) {
				expect((err as Error).message).toEqual('loader exploded');
			}
		});

		it('should default data to null when route has no loader', async () => {
			const route = buildMatch({ loader: null });

			const result = await resolveRoute(route);

			expect(result.data).toEqual(null);
		});

		it('should call route.indexable with the loaded data and use its result', async () => {
			const indexable = vi.fn().mockReturnValue(false);
			const route = buildMatch({
				indexable,
				loader: () => {
					return { id: 'x' };
				}
			});

			const result = await resolveRoute(route);

			expect(indexable).toHaveBeenCalledWith({ id: 'x' });
			expect(result.indexable).toEqual(false);
		});

		it('should default indexable to true when route has no indexable', async () => {
			const route = buildMatch({ indexable: null });

			const result = await resolveRoute(route);

			expect(result.indexable).toEqual(true);
		});

		it('should call route.jsonLd with the loaded data and use its result', async () => {
			const jsonLd = vi.fn().mockReturnValue({ '@type': 'Article' });
			const route = buildMatch({
				jsonLd,
				loader: () => {
					return { id: 'x' };
				}
			});

			const result = await resolveRoute(route);

			expect(jsonLd).toHaveBeenCalledWith({ id: 'x' });
			expect(result.jsonLd).toEqual({ '@type': 'Article' });
		});

		it('should default jsonLd to null when route has no jsonLd', async () => {
			const route = buildMatch({ jsonLd: null });

			const result = await resolveRoute(route);

			expect(result.jsonLd).toEqual(null);
		});

		it('should call route.meta with the loaded data and use its result', async () => {
			const meta = vi.fn().mockReturnValue({ title: 'Meta Title' });
			const route = buildMatch({
				loader: () => {
					return { id: 'x' };
				},
				meta
			});

			const result = await resolveRoute(route);

			expect(meta).toHaveBeenCalledWith({ id: 'x' });
			expect(result.meta).toEqual({ title: 'Meta Title' });
		});

		it('should default meta to null when route has no meta', async () => {
			const route = buildMatch({ meta: null });

			const result = await resolveRoute(route);

			expect(result.meta).toEqual(null);
		});
	});
});
