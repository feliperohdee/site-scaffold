import { afterEach, beforeEach, describe, expect, it, Mock, vi } from 'vitest';
import { env } from 'cloudflare:workers';

import R2Cache from '@/worker/r2-cache';
import {
	CACHE_CREATED_AT_HEADER,
	CACHE_HEADER,
	CACHE_VERSION
} from '@/constants';

const SAMPLE_URL = 'https://example.com/img/transform?src=img.jpg';
const SAMPLE_KEY = `embed-test/${CACHE_VERSION}/img/transform?src=img.jpg`;

describe('@/worker/r2-cache', () => {
	let cache: R2Cache;
	let mockVolatileMatch: Mock;
	let mockVolatilePut: Mock;

	beforeEach(() => {
		cache = new R2Cache({ prefix: 'embed-test' });
		mockVolatileMatch = vi.fn().mockResolvedValue(null);
		mockVolatilePut = vi.fn().mockResolvedValue(null);

		vi.spyOn(env.CACHE, 'get');
		vi.spyOn(env.CACHE, 'put');
		vi.spyOn(caches, 'open').mockResolvedValue({
			add: vi.fn(),
			addAll: vi.fn(),
			delete: vi.fn(),
			keys: vi.fn(),
			match: mockVolatileMatch,
			matchAll: vi.fn(),
			put: mockVolatilePut
		});
	});

	afterEach(() => {
		vi.restoreAllMocks();
	});

	describe('key', () => {
		it('should normalize query param encoding via URL API', () => {
			const result = cache.key(
				'https://example.com/img?src=path/to/file.jpg&title=Hello%20World'
			);

			// URL API normalizes: slashes get encoded, %20 becomes +
			expect(result).toEqual(
				`embed-test/${CACHE_VERSION}/img?src=path%2Fto%2Ffile.jpg&title=Hello+World`
			);
		});

		it('should prepend prefix and sort params', () => {
			const prefixedCache = new R2Cache({ prefix: 'tenant-123' });
			const result = prefixedCache.key(
				'https://example.com/img?w=200&src=test.jpg'
			);

			expect(result).toEqual(
				`tenant-123/${CACHE_VERSION}/img?src=test.jpg&w=200`
			);
		});

		it('should strip empty query string', () => {
			const result = cache.key('https://example.com/img/photo.jpg?');

			expect(result).toEqual(`embed-test/${CACHE_VERSION}/img/photo.jpg`);
		});

		it('should strip leading slashes from pathname', () => {
			const result = cache.key('https://example.com/img/nested/path.jpg');

			expect(result).toEqual(
				`embed-test/${CACHE_VERSION}/img/nested/path.jpg`
			);
		});
	});

	describe('match', () => {
		it('should return from R2 (L2 hit) with cache headers and backfill volatile cache', async () => {
			await env.CACHE.put(SAMPLE_KEY, 'r2-cached', {
				httpMetadata: { contentType: 'image/png' }
			});

			const result = await cache.match(SAMPLE_URL);
			const body = new TextDecoder().decode(await result!.arrayBuffer());

			expect(body).toEqual('r2-cached');
			expect(result!.headers.get(CACHE_HEADER)).toEqual('HIT');
			expect(result!.headers.get('content-type')).toEqual('image/png');
			expect(result!.headers.get(CACHE_CREATED_AT_HEADER)).toMatch(
				/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/
			);
			expect(mockVolatilePut).toHaveBeenCalledWith(
				`https://r2-cache/${SAMPLE_KEY}`,
				expect.any(Response)
			);
		});

		it('should return from volatile cache (L1 hit) with cache headers', async () => {
			const createdAt = new Date(Date.now() - 60000).toISOString(); // 1 minute ago

			mockVolatileMatch.mockResolvedValue(
				new Response('volatile-cached', {
					headers: {
						[CACHE_CREATED_AT_HEADER]: createdAt,
						'content-type': 'image/png'
					}
				})
			);

			const result = await cache.match(SAMPLE_URL);
			const body = new TextDecoder().decode(await result!.arrayBuffer());

			expect(body).toEqual('volatile-cached');
			expect(result!.headers.get(CACHE_HEADER)).toEqual('HIT');
			expect(result!.headers.get(CACHE_CREATED_AT_HEADER)).toEqual(
				createdAt
			);
			expect(vi.mocked(env.CACHE.get)).not.toHaveBeenCalled();
		});

		it('should return null when both layers miss', async () => {
			const result = await cache.match(SAMPLE_URL);

			expect(result).toEqual(null);
			expect(mockVolatileMatch).toHaveBeenCalledWith(
				`https://r2-cache/${SAMPLE_KEY}`
			);
			expect(vi.mocked(env.CACHE.get)).toHaveBeenCalledOnce();
		});
	});

	describe('put', () => {
		it('should default content-type to application/octet-stream', async () => {
			const response = new Response(new Uint8Array([1, 2, 3]));

			await cache.put(SAMPLE_URL, response);

			const obj = await env.CACHE.get(SAMPLE_KEY);
			const metadata = obj!.httpMetadata;
			// drain body — isolatedStorage rollback fails if the R2 stream handle is still open
			await obj!.arrayBuffer();

			expect(metadata?.cacheControl).toEqual('');
			expect(metadata?.contentType).toEqual('application/octet-stream');
		});

		it('should handle null body gracefully', async () => {
			const response = new Response(null, {
				headers: { 'content-type': 'image/png' }
			});

			await cache.put(SAMPLE_URL, response);

			expect(mockVolatilePut).toHaveBeenCalledOnce();
			expect(vi.mocked(env.CACHE.put)).toHaveBeenCalledOnce();

			const obj = await env.CACHE.get(SAMPLE_KEY);
			expect(obj).not.toEqual(null);
			// drain body — isolatedStorage rollback fails if the R2 stream handle is still open
			await obj!.arrayBuffer();
		});

		it('should store in both layers with correct httpMetadata and created-at header', async () => {
			const response = new Response('image-data', {
				headers: {
					'cache-control': 'public, max-age=31536000',
					'content-type': 'image/webp'
				}
			});

			await cache.put(SAMPLE_URL, response);

			expect(mockVolatilePut).toHaveBeenCalledWith(
				`https://r2-cache/${SAMPLE_KEY}`,
				expect.any(Response)
			);

			const volatileResponse: Response = mockVolatilePut.mock.calls[0][1];
			expect(
				volatileResponse.headers.get(CACHE_CREATED_AT_HEADER)
			).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);

			const obj = await env.CACHE.get(SAMPLE_KEY);
			expect(obj).not.toEqual(null);
			expect(obj!.httpMetadata?.cacheControl).toEqual(
				'public, max-age=31536000'
			);
			expect(obj!.httpMetadata?.contentType).toEqual('image/webp');
			expect(await obj!.text()).toEqual('image-data');
		});
	});

	describe('volatile: false', () => {
		let nonVolatileCache: R2Cache;

		beforeEach(() => {
			nonVolatileCache = new R2Cache({
				prefix: 'embed-test',
				volatile: false
			});
		});

		it('should skip the volatile layer on match and go straight to R2', async () => {
			await env.CACHE.put(SAMPLE_KEY, 'r2-only', {
				httpMetadata: { contentType: 'image/png' }
			});
			vi.mocked(env.CACHE.get).mockClear();

			const result = await nonVolatileCache.match(SAMPLE_URL);
			const body = new TextDecoder().decode(await result!.arrayBuffer());

			expect(body).toEqual('r2-only');
			expect(mockVolatileMatch).not.toHaveBeenCalled();
			expect(mockVolatilePut).not.toHaveBeenCalled();
			expect(vi.mocked(env.CACHE.get)).toHaveBeenCalledOnce();
		});

		it('should skip the volatile layer on put and only write to R2', async () => {
			const response = new Response('payload', {
				headers: {
					'cache-control': 'public, max-age=60',
					'content-type': 'image/png'
				}
			});

			await nonVolatileCache.put(SAMPLE_URL, response);

			expect(mockVolatilePut).not.toHaveBeenCalled();
			expect(vi.mocked(env.CACHE.put)).toHaveBeenCalledOnce();

			const obj = await env.CACHE.get(SAMPLE_KEY);
			expect(obj).not.toEqual(null);
			const metadata = obj!.httpMetadata;
			// drain body — isolatedStorage rollback fails if the R2 stream handle is still open
			await obj!.arrayBuffer();

			expect(metadata?.cacheControl).toEqual('public, max-age=60');
			expect(metadata?.contentType).toEqual('image/png');
		});
	});
});
