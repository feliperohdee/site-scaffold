import { describe, expect, it } from 'vitest';

import ContextStorage from '@/worker/context-storage';

const buildRequest = (
	url: string,
	options: { country?: string } = {}
): Request => {
	const request = new Request(url);

	if (options.country) {
		Object.defineProperty(request, 'cf', {
			value: { country: options.country }
		});
	}

	return request;
};

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

		it('should default lang to en-us when neither cf.country nor _lang is present', () => {
			const storage = new ContextStorage({
				request: new Request('https://example.com/')
			});

			expect(storage.lang).toEqual('en-us');
		});

		it('should resolve lang from request.cf.country', () => {
			const storage = new ContextStorage({
				request: buildRequest('https://example.com/', { country: 'BR' })
			});

			expect(storage.lang).toEqual('pt-br');
		});

		it('should let _lang URL param override cf.country when valid', () => {
			const storage = new ContextStorage({
				request: buildRequest('https://example.com/?_lang=fr-fr', {
					country: 'BR'
				})
			});

			expect(storage.lang).toEqual('fr-fr');
		});

		it('should fall back to cf.country when _lang is invalid', () => {
			const storage = new ContextStorage({
				request: buildRequest('https://example.com/?_lang=xx-xx', {
					country: 'JP'
				})
			});

			expect(storage.lang).toEqual('ja-jp');
		});

		it('should default pathParams to an empty object', () => {
			const storage = new ContextStorage({
				request: new Request('https://example.com/')
			});

			expect(storage.pathParams).toEqual({});
		});
	});

	describe('setPathParams', () => {
		it('should assign pathParams after construction', () => {
			const storage = new ContextStorage({
				request: new Request('https://example.com/articles/hello')
			});

			storage.setPathParams({ slug: 'hello' });

			expect(storage.pathParams).toEqual({ slug: 'hello' });
		});
	});
});
