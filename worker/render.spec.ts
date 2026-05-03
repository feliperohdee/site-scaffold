import {
	afterEach,
	beforeEach,
	describe,
	expect,
	it,
	MockInstance,
	vi
} from 'vitest';

import ContextStorage from '@/worker/context-storage';
import R2Cache from '@/worker/r2-cache';
import context from '@/worker/context';
import renderHtml, { renderStream, renderWithCache } from '@/worker/render';
import { CACHE_HEADER, SITE_NAME } from '@/constants';

const drain = async (stream: ReadableStream<Uint8Array>): Promise<string> => {
	const text = await new Response(stream).text();

	return text;
};

const buildRequest = (url: string): Request => {
	return new Request(url);
};

const inContext = <T>(
	req: Request,
	fn: (req: Request) => Promise<T>
): Promise<T> => {
	return context.run(new ContextStorage({ request: req }), () => {
		return fn(req);
	});
};

describe('@/worker/render', () => {
	describe('renderHtml (cache disabled in dev)', () => {
		it('should bypass the cache and stream a fresh render every time', async () => {
			// In dev mode (the default for vitest), CACHE_ENABLED is false.
			// renderHtml should never touch R2Cache — verify by spying on the prototype.
			const matchSpy = vi.spyOn(R2Cache.prototype, 'match');
			const putSpy = vi.spyOn(R2Cache.prototype, 'put');

			try {
				const response = await inContext(
					buildRequest('https://example.com/'),
					renderHtml
				);
				const body = await response.text();

				expect(matchSpy).not.toHaveBeenCalled();
				expect(putSpy).not.toHaveBeenCalled();
				expect(body).toContain(SITE_NAME);
				expect(response.headers.get('content-type')).toEqual(
					'text/html; charset=utf-8'
				);
			} finally {
				vi.restoreAllMocks();
			}
		});
	});

	describe('renderStream', () => {
		describe('headers / shell', () => {
			it('should produce HTML starting with <!DOCTYPE html>', async () => {
				const stream = await inContext(
					buildRequest('https://example.com/'),
					renderStream
				);
				const body = await drain(stream);

				expect(body.startsWith('<!DOCTYPE html>')).toEqual(true);
			});

			it('should include the root mount node', async () => {
				const stream = await inContext(
					buildRequest('https://example.com/'),
					renderStream
				);
				const body = await drain(stream);

				expect(body).toContain('<div id="root">');
			});

			it('should include the bootstrap module script tag pointing at the client entry', async () => {
				const stream = await inContext(
					buildRequest('https://example.com/'),
					renderStream
				);
				const body = await drain(stream);

				const scriptMatch = body.match(
					/<script[^>]+src="(\/app\/index\.tsx|\/assets\/client\.js)"[^>]*><\/script>/
				);

				expect(scriptMatch).not.toEqual(null);
				expect(scriptMatch![0]).toContain('type="module"');
			});

			it('should include the React Refresh preamble script in dev', async () => {
				const stream = await inContext(
					buildRequest('https://example.com/'),
					renderStream
				);
				const body = await drain(stream);

				expect(body).toContain(
					'__vite_plugin_react_preamble_installed__'
				);
			});

			it('should embed a __data application/json script', async () => {
				const stream = await inContext(
					buildRequest('https://example.com/'),
					renderStream
				);
				const body = await drain(stream);

				expect(body).toMatch(
					/<script[^>]*id="__data"[^>]*type="application\/json"[^>]*>/
				);
			});
		});

		describe('routing', () => {
			it('should render the home page for /', async () => {
				const stream = await inContext(
					buildRequest('https://example.com/'),
					renderStream
				);
				const body = await drain(stream);

				expect(body).toContain(`<title>${SITE_NAME} — home</title>`);
				expect(body).toContain('Server-rendered');
				expect(body).toContain('Clicked ');
			});

			it('should render the slug page for /:slug with the slug as pathParam', async () => {
				const stream = await inContext(
					buildRequest('https://example.com/hello-world'),
					renderStream
				);
				const body = await drain(stream);

				expect(body).toContain(
					`<title>hello-world — ${SITE_NAME}</title>`
				);
				expect(body).toContain('hello-world');
			});

			it('should render the not-found page for unmatched routes', async () => {
				const stream = await inContext(
					buildRequest('https://example.com/some/missing/path'),
					renderStream
				);
				const body = await drain(stream);

				expect(body).toContain(
					`<title>Not found — ${SITE_NAME}</title>`
				);
				expect(body).toContain('404');
			});
		});

		describe('hydration meta', () => {
			it('should embed { data: null, page, pathParams, searchParams } for routes without a loader', async () => {
				const stream = await inContext(
					buildRequest('https://example.com/'),
					renderStream
				);
				const body = await drain(stream);

				const match = body.match(
					/<script[^>]*id="__data"[^>]*type="application\/json"[^>]*>([\s\S]*?)<\/script>/
				);

				expect(match).not.toEqual(null);
				expect(JSON.parse(match![1])).toMatchObject({
					data: null,
					page: 'home',
					pathParams: {},
					searchParams: ''
				});
			});

			it('should embed loader output as data and propagate page + pathParams for parametrized routes', async () => {
				const stream = await inContext(
					buildRequest('https://example.com/articles/non-existent'),
					renderStream
				);
				const body = await drain(stream);

				const match = body.match(
					/<script[^>]*id="__data"[^>]*type="application\/json"[^>]*>([\s\S]*?)<\/script>/
				);

				expect(match).not.toEqual(null);
				expect(JSON.parse(match![1])).toMatchObject({
					data: null,
					page: 'article',
					pathParams: { slug: 'non-existent' },
					searchParams: ''
				});
			});

			it('should serialize searchParams into the hydration meta', async () => {
				const stream = await inContext(
					buildRequest('https://example.com/?a=1&b=hello+world'),
					renderStream
				);
				const body = await drain(stream);

				const match = body.match(
					/<script[^>]*id="__data"[^>]*type="application\/json"[^>]*>([\s\S]*?)<\/script>/
				);

				expect(match).not.toEqual(null);
				expect(JSON.parse(match![1]).searchParams).toEqual(
					'a=1&b=hello+world'
				);
			});

			it('should emit page = "not-found" for unmatched routes', async () => {
				const stream = await inContext(
					buildRequest('https://example.com/some/missing/path'),
					renderStream
				);
				const body = await drain(stream);

				const match = body.match(
					/<script[^>]*id="__data"[^>]*type="application\/json"[^>]*>([\s\S]*?)<\/script>/
				);

				expect(match).not.toEqual(null);
				expect(JSON.parse(match![1])).toMatchObject({
					data: null,
					indexable: false,
					page: 'not-found',
					pathParams: {},
					searchParams: ''
				});
			});
		});

		describe('metadata hoisting', () => {
			it('should hoist <title> into <head>', async () => {
				const stream = await inContext(
					buildRequest('https://example.com/'),
					renderStream
				);
				const body = await drain(stream);

				expect(body).toMatch(
					new RegExp(
						`<head[^>]*>[\\s\\S]*<title>${SITE_NAME} — home</title>[\\s\\S]*</head>`
					)
				);
			});
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

		afterEach(() => {
			vi.restoreAllMocks();
		});

		describe('cache hit', () => {
			it('should return the cached response without rendering or writing back', async () => {
				const cachedResponse = new Response('CACHED HTML', {
					headers: {
						'content-type': 'text/html; charset=utf-8',
						[CACHE_HEADER]: 'HIT'
					}
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
				expect(response.headers.get(CACHE_HEADER)).toEqual('HIT');
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
		});

		describe('cache miss', () => {
			beforeEach(() => {
				matchSpy.mockResolvedValueOnce(null);
			});

			it('should respond with content-type text/html; charset=utf-8', async () => {
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

			it('should respond with cache-control public, max-age=300', async () => {
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

			it('should write the rendered html to the cache via waitUntil', async () => {
				const response = await inContext(
					buildRequest('https://example.com/foo'),
					req => {
						return renderWithCache(req, cache);
					}
				);

				// drain client stream so the tee'd cache stream can also drain
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
				expect(await cachedResponse.text()).toContain(SITE_NAME);
			});

			it('should call cache.match with no version arg for non-scoped routes (regression: legacy fast path is preserved)', async () => {
				matchSpy.mockResolvedValueOnce(null);

				await inContext(buildRequest('https://example.com/'), req => {
					return renderWithCache(req, cache);
				});

				// `/` is the home route, no cacheScope — match() called with one arg only.
				expect(matchSpy).toHaveBeenCalledWith('https://example.com/');
			});
		});

		describe('scoped cache (route declares cacheScope)', () => {
			// /articles/:slug declares cacheScope: `articles/v1/<slug>/<date>`.
			// /articles/hello-world resolves via the seed article (date 2026-05-02).
			const SCOPED_URL = 'https://example.com/articles/hello-world';
			const EXPECTED_VERSION = 'articles/v1/hello-world/2026-05-02';

			it('should pass the synthesized version to cache.match', async () => {
				matchSpy.mockResolvedValueOnce(null);

				await inContext(buildRequest(SCOPED_URL), req => {
					return renderWithCache(req, cache);
				});

				expect(matchSpy).toHaveBeenCalledWith(
					SCOPED_URL,
					EXPECTED_VERSION
				);
			});

			it('should pass the synthesized version to cache.put on miss', async () => {
				matchSpy.mockResolvedValueOnce(null);

				const response = await inContext(
					buildRequest(SCOPED_URL),
					req => {
						return renderWithCache(req, cache);
					}
				);

				// drain client stream so the tee'd cache stream can also drain
				await response.text();

				await vi.waitFor(() => {
					expect(putSpy).toHaveBeenCalledOnce();
				});

				const [cacheKey, , version] = putSpy.mock.calls[0];
				expect(cacheKey).toEqual(SCOPED_URL);
				expect(version).toEqual(EXPECTED_VERSION);
			});

			it('should HIT and skip rendering when the cache has a match (loader still ran to produce the version, proven via the match() call signature)', async () => {
				const cachedResponse = new Response('CACHED ARTICLE', {
					headers: {
						'content-type': 'text/html; charset=utf-8',
						[CACHE_HEADER]: 'HIT'
					}
				});
				matchSpy.mockResolvedValueOnce(cachedResponse);

				const response = await inContext(
					buildRequest(SCOPED_URL),
					req => {
						return renderWithCache(req, cache);
					}
				);
				const body = await response.text();

				expect(body).toEqual('CACHED ARTICLE');
				expect(response.headers.get(CACHE_HEADER)).toEqual('HIT');
				expect(matchSpy).toHaveBeenCalledWith(
					SCOPED_URL,
					EXPECTED_VERSION
				);
				expect(putSpy).not.toHaveBeenCalled();
			});
		});
	});
});
