import _ from 'lodash';
import { describe, expect, it } from 'vitest';

import {
	buildExcerpt,
	computeReadingTime,
	getArticleBySlug,
	getArticles,
	parseFrontmatter,
	renderMarkdown,
	slugFromPath,
	stripMarkdown
} from '@/app/libs/articles';

describe('@/app/libs/articles', () => {
	describe('buildExcerpt', () => {
		it('should use the override when provided', () => {
			const result = buildExcerpt(
				'# Heading\n\nLong markdown body that should be ignored.',
				'Custom excerpt'
			);

			expect(result).toEqual('Custom excerpt');
		});

		it('should return the stripped body when shorter than 160 chars', () => {
			const result = buildExcerpt('Hello **world**.', null);

			expect(result).toEqual('Hello world.');
		});

		it('should truncate with an ellipsis when longer than 160 chars', () => {
			const long = 'word '.repeat(60).trim();
			const result = buildExcerpt(long, null);

			expect(_.size(result)).toEqual(158);
			expect(result.endsWith('…')).toEqual(true);
		});
	});

	describe('computeReadingTime', () => {
		it('should round up to a 1-minute minimum', () => {
			expect(computeReadingTime('only a few words here')).toEqual(1);
			expect(computeReadingTime('')).toEqual(1);
		});

		it('should round to the nearest minute at ~200 wpm', () => {
			const sixHundredWords = 'word '.repeat(600).trim();

			expect(computeReadingTime(sixHundredWords)).toEqual(3);
		});
	});

	describe('getArticleBySlug', () => {
		it('should return the article matching the slug', () => {
			const article = getArticleBySlug('hello-world');

			expect(article?.slug).toEqual('hello-world');
			expect(article?.title).toEqual('Hello, World');
		});

		it('should return null when no article matches', () => {
			const article = getArticleBySlug('does-not-exist');

			expect(article).toEqual(null);
		});
	});

	describe('getArticles', () => {
		it('should auto-discover the seed hello-world article', () => {
			const articles = getArticles();
			const slugs = articles.map(article => {
				return article.slug;
			});

			expect(slugs).toContain('hello-world');
		});

		it('should expose the parsed frontmatter on each article', () => {
			const article = getArticles().find(item => {
				return item.slug === 'hello-world';
			});

			expect(article).toMatchObject({
				date: '2026-05-02',
				excerpt:
					'A friendly tour of the new markdown article system — drop a file, get a page.',
				slug: 'hello-world',
				tags: ['meta', 'writing'],
				title: 'Hello, World'
			});
			expect(article?.readingTime).toBeGreaterThanOrEqual(1);
			expect(article?.content.startsWith('---')).toEqual(false);
		});

		it('should sort by date descending', () => {
			const dates = getArticles().map(article => {
				return article.date;
			});
			const sorted = [...dates].sort((a, b) => {
				return b.localeCompare(a);
			});

			expect(dates).toEqual(sorted);
		});
	});

	describe('parseFrontmatter', () => {
		it('should return the raw body when no frontmatter delimiters are present', () => {
			const result = parseFrontmatter('# Just a heading\n\nBody.');

			expect(result).toEqual({
				body: '# Just a heading\n\nBody.',
				meta: {}
			});
		});

		it('should split frontmatter from body and parse string values', () => {
			const result = parseFrontmatter(
				'---\ntitle: Hello\ndate: 2026-05-02\n---\nBody here.'
			);

			expect(result.meta).toEqual({
				date: '2026-05-02',
				title: 'Hello'
			});
			expect(result.body).toEqual('Body here.');
		});

		it('should strip surrounding double or single quotes from string values', () => {
			const result = parseFrontmatter(
				'---\ntitle: "Quoted Title"\nauthor: \'Single\'\n---\nx'
			);

			expect(result.meta.title).toEqual('Quoted Title');
			expect(result.meta.author).toEqual('Single');
		});

		it('should parse bracketed comma-separated values into a string array', () => {
			const result = parseFrontmatter(
				'---\ntags: [react, web, "with space"]\n---\n'
			);

			expect(result.meta.tags).toEqual(['react', 'web', 'with space']);
		});

		it('should ignore lines without a colon', () => {
			const result = parseFrontmatter(
				'---\ntitle: Hello\nthis is junk\ndate: 2026-05-02\n---\n'
			);

			expect(result.meta).toEqual({
				date: '2026-05-02',
				title: 'Hello'
			});
		});
	});

	describe('renderMarkdown', () => {
		it('should render headings, emphasis, and code into HTML', () => {
			const html = renderMarkdown(
				'# Title\n\nHello **world** and `code`.'
			);

			expect(html).toContain('<h1>Title</h1>');
			expect(html).toContain('<strong>world</strong>');
			expect(html).toContain('<code>code</code>');
		});

		it('should return an empty string for empty input', () => {
			expect(renderMarkdown('')).toEqual('');
		});
	});

	describe('slugFromPath', () => {
		it('should derive the slug from the filename, stripping .md', () => {
			expect(slugFromPath('../content/articles/hello-world.md')).toEqual(
				'hello-world'
			);
		});

		it('should handle paths with no directory prefix', () => {
			expect(slugFromPath('post.md')).toEqual('post');
		});
	});

	describe('stripMarkdown', () => {
		it('should remove fenced code blocks entirely', () => {
			const result = stripMarkdown(
				'Hello\n\n```ts\nconst x = 1;\n```\n\nWorld.'
			);

			expect(result).toEqual('Hello World.');
		});

		it('should drop images and keep link text', () => {
			const result = stripMarkdown(
				'![alt](https://x.test/img.png) See [the docs](https://x.test).'
			);

			expect(result).toEqual('See the docs.');
		});

		it('should strip headings, list bullets, blockquotes, and emphasis markers', () => {
			const raw =
				'# Title\n\n> A quote\n\n- one\n- two\n\n*bold* _italic_ ~strike~';
			const result = stripMarkdown(raw);

			expect(result).toEqual('Title A quote one two bold italic strike');
		});

		it('should unwrap inline code', () => {
			const result = stripMarkdown('use `npm install` to start');

			expect(result).toEqual('use npm install to start');
		});
	});
});
