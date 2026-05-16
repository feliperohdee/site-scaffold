import { describe, expect, it } from 'vitest';
import { renderToString } from 'react-dom/server';

import DocumentHead from '@/app/components/document-head';

describe('@/app/components/document-head', () => {
	describe('opted out (meta === null)', () => {
		it('should render only the robots noindex tag when indexable is false', () => {
			const html = renderToString(
				<DocumentHead
					indexable={false}
					jsonLd={null}
					meta={null}
				/>
			);

			expect(html).toEqual(
				'<meta content="noindex,nofollow" name="robots"/>'
			);
		});

		it('should still emit JSON-LD even when meta is null (route can declare jsonLd alone)', () => {
			const html = renderToString(
				<DocumentHead
					indexable={true}
					jsonLd={{ '@type': 'WebSite' }}
					meta={null}
				/>
			);

			expect(html).toContain('<script type="application/ld+json">');
			expect(html).toContain('"@type":"WebSite"');
		});

		it('should render nothing when both branches stay silent (indexable true, jsonLd null)', () => {
			const html = renderToString(
				<DocumentHead
					indexable={true}
					jsonLd={null}
					meta={null}
				/>
			);

			expect(html).toEqual('');
		});
	});

	describe('opted in (meta provided)', () => {
		it('should emit title + og:title + og:type=website + twitter:card for a minimal meta', () => {
			const html = renderToString(
				<DocumentHead
					indexable={true}
					jsonLd={null}
					meta={{ title: 'Hello' }}
				/>
			);

			expect(html).toContain('<title>Hello</title>');
			expect(html).toContain(
				'<meta content="Hello" property="og:title"/>'
			);
			expect(html).toContain(
				'<meta content="website" property="og:type"/>'
			);
			expect(html).toContain(
				'<meta content="summary_large_image" name="twitter:card"/>'
			);
			expect(html).not.toContain('name="description"');
			expect(html).not.toContain('rel="canonical"');
			expect(html).not.toContain('property="og:image"');
			expect(html).not.toContain('name="robots"');
		});

		it('should emit description + og:description when description is provided', () => {
			const html = renderToString(
				<DocumentHead
					indexable={true}
					jsonLd={null}
					meta={{ description: 'A short blurb', title: 'Hello' }}
				/>
			);

			expect(html).toContain(
				'<meta content="A short blurb" name="description"/>'
			);
			expect(html).toContain(
				'<meta content="A short blurb" property="og:description"/>'
			);
		});

		it('should emit og:image when image is provided', () => {
			const html = renderToString(
				<DocumentHead
					indexable={true}
					jsonLd={null}
					meta={{ image: 'https://x.test/a.jpg', title: 'Hello' }}
				/>
			);

			expect(html).toContain(
				'<meta content="https://x.test/a.jpg" property="og:image"/>'
			);
		});

		it('should emit canonical link when canonical is provided', () => {
			const html = renderToString(
				<DocumentHead
					indexable={true}
					jsonLd={null}
					meta={{ canonical: '/x', title: 'Hello' }}
				/>
			);

			expect(html).toContain('<link href="/x" rel="canonical"/>');
		});

		it('should override og:type via the ogType field', () => {
			const html = renderToString(
				<DocumentHead
					indexable={true}
					jsonLd={null}
					meta={{ ogType: 'article', title: 'Hello' }}
				/>
			);

			expect(html).toContain(
				'<meta content="article" property="og:type"/>'
			);
			expect(html).not.toContain('content="website"');
		});

		it('should emit robots noindex AND keep meta tags when indexable is false', () => {
			const html = renderToString(
				<DocumentHead
					indexable={false}
					jsonLd={null}
					meta={{ canonical: '/x', title: 'Thin page' }}
				/>
			);

			expect(html).toContain('<title>Thin page</title>');
			expect(html).toContain('<link href="/x" rel="canonical"/>');
			expect(html).toContain(
				'<meta content="noindex,nofollow" name="robots"/>'
			);
		});

		it('should render JSON-LD alongside the meta tags when both are provided', () => {
			const html = renderToString(
				<DocumentHead
					indexable={true}
					jsonLd={{ '@type': 'Article', headline: 'Hello' }}
					meta={{ title: 'Hello' }}
				/>
			);

			expect(html).toContain('<title>Hello</title>');
			expect(html).toContain('<script type="application/ld+json">');
			expect(html).toContain('"@type":"Article"');
		});

		it('should emit the full set of tags when every meta field is populated (smoke test)', () => {
			const html = renderToString(
				<DocumentHead
					indexable={true}
					jsonLd={{ '@type': 'Article', headline: 'Full' }}
					meta={{
						canonical: '/full',
						description: 'Everything populated.',
						image: 'https://x.test/full.jpg',
						ogType: 'article',
						title: 'Full'
					}}
				/>
			);

			expect(html).toContain('<title>Full</title>');
			expect(html).toContain('property="og:title"');
			expect(html).toContain(
				'<meta content="article" property="og:type"/>'
			);
			expect(html).toContain('name="twitter:card"');
			expect(html).toContain('name="description"');
			expect(html).toContain('property="og:description"');
			expect(html).toContain('property="og:image"');
			expect(html).toContain('rel="canonical"');
			expect(html).toContain('<script type="application/ld+json">');
			expect(html).not.toContain('name="robots"');
		});
	});
});
