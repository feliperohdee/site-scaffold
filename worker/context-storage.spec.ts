import { describe, expect, it } from 'vitest';

import ContextStorage from '@/worker/context-storage';

describe('@/worker/context-storage', () => {
	describe('constructor', () => {
		it('should expose the request', () => {
			const request = new Request('https://example.com/foo?bar=1');
			const storage = new ContextStorage({ request });

			expect(storage.request).toBe(request);
		});

		it('should derive a URL from the request', () => {
			const storage = new ContextStorage({
				request: new Request('https://example.com/foo?bar=1')
			});

			expect(storage.url).toBeInstanceOf(URL);
			expect(storage.url.pathname).toEqual('/foo');
			expect(storage.url.searchParams.get('bar')).toEqual('1');
		});

		it('should expose searchParams from the URL', () => {
			const storage = new ContextStorage({
				request: new Request('https://example.com/foo?bar=1&baz=2')
			});

			expect(storage.searchParams).toBe(storage.url.searchParams);
			expect(storage.searchParams.get('bar')).toEqual('1');
			expect(storage.searchParams.get('baz')).toEqual('2');
		});

		it('should default pathParams to an empty object', () => {
			const storage = new ContextStorage({
				request: new Request('https://example.com/')
			});

			expect(storage.pathParams).toEqual({});
		});
	});

	describe('pathParams mutation', () => {
		it('should allow callers to assign pathParams after construction', () => {
			const storage = new ContextStorage({
				request: new Request('https://example.com/articles/hello')
			});

			storage.pathParams = { slug: 'hello' };

			expect(storage.pathParams).toEqual({ slug: 'hello' });
		});
	});
});
