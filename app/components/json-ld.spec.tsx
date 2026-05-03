import _ from 'lodash';
import { describe, expect, it } from 'vitest';
import { renderToString } from 'react-dom/server';

import JsonLd from '@/app/components/json-ld';

const SCRIPT_TAG =
	/<script[^>]*type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/g;

const extract = (html: string): string[] => {
	return _.map(Array.from(html.matchAll(SCRIPT_TAG)), match => {
		return match[1];
	});
};

describe('@/app/components/json-ld', () => {
	describe('JsonLd', () => {
		it('should render nothing when data is null', () => {
			const html = renderToString(<JsonLd data={null} />);

			expect(html).toEqual('');
		});

		it('should render nothing when data is undefined', () => {
			const html = renderToString(<JsonLd data={undefined} />);

			expect(html).toEqual('');
		});

		it('should render a single <script type="application/ld+json"> for an object', () => {
			const html = renderToString(
				<JsonLd
					data={{
						'@context': 'https://schema.org',
						'@type': 'Article',
						headline: 'Hello'
					}}
				/>
			);
			const payloads = extract(html);

			expect(payloads).toHaveLength(1);
			expect(JSON.parse(payloads[0])).toEqual({
				'@context': 'https://schema.org',
				'@type': 'Article',
				headline: 'Hello'
			});
		});

		it('should render one <script> per item when data is an array', () => {
			const html = renderToString(
				<JsonLd
					data={[
						{ '@type': 'Article', headline: 'A' },
						{ '@type': 'Article', headline: 'B' }
					]}
				/>
			);
			const payloads = extract(html);

			expect(payloads).toHaveLength(2);
			expect(JSON.parse(payloads[0])).toEqual({
				'@type': 'Article',
				headline: 'A'
			});
			expect(JSON.parse(payloads[1])).toEqual({
				'@type': 'Article',
				headline: 'B'
			});
		});

		it('should escape script-injection payloads via safeJsonStringify', () => {
			const html = renderToString(
				<JsonLd
					data={{
						hostile: '</script><script>alert(1)</script>'
					}}
				/>
			);

			expect(html).not.toContain('</script><script>');
			expect(html).toContain('\\u003c/script\\u003e');
		});

		it('should round-trip a string content through JSON.parse', () => {
			const data = { headline: 'a&b<c>d', tags: ['x', 'y'] };
			const html = renderToString(<JsonLd data={data} />);
			const payloads = extract(html);

			expect(JSON.parse(payloads[0])).toEqual(data);
		});

		it('should render zero <script> tags when given an empty array', () => {
			const html = renderToString(<JsonLd data={[]} />);
			const payloads = extract(html);

			expect(payloads).toHaveLength(0);
		});
	});
});
