import _ from 'lodash';
import { describe, expect, it } from 'vitest';

import {
	buildArticle,
	buildExcerpt,
	computeReadingTime,
	getArticleBySlug,
	getArticles,
	isArticle,
	isArticleList,
	parseMarkdownDocument,
	parseValue,
	renderMarkdown,
	slugFromPath,
	stripMarkdown,
	stripQuotes
} from '@/app/libs/articles';

describe('@/app/libs/articles', () => {
	describe('buildArticle', () => {
		it('should fall back to filename and defaults when frontmatter is missing', () => {
			const result = buildArticle(
				'../content/articles/from-path.md',
				'Body without frontmatter.'
			);

			expect(result).toEqual({
				content: 'Body without frontmatter.',
				date: '',
				excerpt: 'Body without frontmatter.',
				readingTime: 1,
				slug: 'from-path',
				tags: [],
				title: 'from-path'
			});
		});

		it('should use frontmatter values when present and honor the excerpt override', () => {
			const raw =
				'---\ntitle: Custom Title\nslug: custom-slug\ndate: 2026-05-02\ntags: [react, web]\nexcerpt: Custom excerpt\n---\nBody content.';
			const result = buildArticle('../content/articles/ignored.md', raw);

			expect(result).toEqual({
				content: 'Body content.',
				date: '2026-05-02',
				excerpt: 'Custom excerpt',
				readingTime: 1,
				slug: 'custom-slug',
				tags: ['react', 'web'],
				title: 'Custom Title'
			});
		});
	});

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
		it('should return the article matching its own slug for any discovered article', () => {
			const first = getArticles()[0];

			expect(getArticleBySlug(first.slug)?.slug).toEqual(first.slug);
		});

		it('should return null when no article matches', () => {
			const result = getArticleBySlug(
				'this-slug-cannot-exist-in-production'
			);

			expect(result).toEqual(null);
		});
	});

	describe('getArticles', () => {
		it('should expose Article-shaped records with parsed frontmatter', () => {
			const articles = getArticles();

			expect(_.size(articles)).toBeGreaterThan(0);
			_.forEach(articles, article => {
				expect(article).toMatchObject({
					content: expect.any(String),
					date: expect.any(String),
					excerpt: expect.any(String),
					readingTime: expect.any(Number),
					slug: expect.any(String),
					tags: expect.any(Array),
					title: expect.any(String)
				});
				expect(article.readingTime).toBeGreaterThanOrEqual(1);
				expect(article.content.startsWith('---')).toEqual(false);
			});
		});

		it('should sort by date descending', () => {
			const dates = _.map(getArticles(), article => {
				return article.date;
			});
			const sorted = [...dates].sort((a, b) => {
				return b.localeCompare(a);
			});

			expect(dates).toEqual(sorted);
		});
	});

	describe('isArticle', () => {
		it('should return false for null', () => {
			expect(isArticle(null)).toEqual(false);
		});

		it('should return false for undefined', () => {
			expect(isArticle(undefined)).toEqual(false);
		});

		it('should return false for primitives', () => {
			expect(isArticle('string')).toEqual(false);
			expect(isArticle(42)).toEqual(false);
			expect(isArticle(true)).toEqual(false);
		});

		it('should return false for plain objects without slug', () => {
			expect(isArticle({ title: 'x' })).toEqual(false);
		});

		it('should return true for objects with a slug field', () => {
			expect(isArticle({ slug: 'hello' })).toEqual(true);
		});
	});

	describe('isArticleList', () => {
		it('should return false for null', () => {
			expect(isArticleList(null)).toEqual(false);
		});

		it('should return false for undefined', () => {
			expect(isArticleList(undefined)).toEqual(false);
		});

		it('should return false for non-array values', () => {
			expect(isArticleList({ slug: 'hello' })).toEqual(false);
			expect(isArticleList('string')).toEqual(false);
			expect(isArticleList(42)).toEqual(false);
		});

		it('should return true for an empty array', () => {
			expect(isArticleList([])).toEqual(true);
		});
	});

	describe('parseMarkdownDocument', () => {
		it('should return the raw body when no frontmatter delimiters are present', () => {
			const result = parseMarkdownDocument('# Just a heading\n\nBody.');

			expect(result).toEqual({
				body: '# Just a heading\n\nBody.',
				meta: {}
			});
		});

		it('should split frontmatter from the body', () => {
			const result = parseMarkdownDocument(
				'---\ntitle: Hello\n---\nBody here.'
			);

			expect(result.meta).toEqual({ title: 'Hello' });
			expect(result.body).toEqual('Body here.');
		});

		it('should ignore lines without a colon', () => {
			const result = parseMarkdownDocument(
				'---\ntitle: Hello\nthis is junk\ndate: 2026-05-02\n---\n'
			);

			expect(result.meta).toEqual({
				date: '2026-05-02',
				title: 'Hello'
			});
		});

		it('should ignore lines whose key is empty after trimming', () => {
			const result = parseMarkdownDocument(
				'---\ntitle: Hello\n   : orphan\n---\n'
			);

			expect(result.meta).toEqual({ title: 'Hello' });
		});

		it('should parse frontmatter with CRLF line endings', () => {
			const result = parseMarkdownDocument(
				'---\r\ntitle: Hello\r\ndate: 2026-05-02\r\n---\r\nBody.'
			);

			expect(result).toEqual({
				body: 'Body.',
				meta: {
					date: '2026-05-02',
					title: 'Hello'
				}
			});
		});
	});

	describe('parseValue', () => {
		it('should parse bracketed comma-separated values into a string array', () => {
			expect(parseValue('[react, web, "with space"]')).toEqual([
				'react',
				'web',
				'with space'
			]);
		});

		it('should parse an empty bracketed value as an empty array', () => {
			expect(parseValue('[]')).toEqual([]);
		});

		it('should drop empty items inside a bracketed value', () => {
			expect(parseValue('[react, , web,   ]')).toEqual(['react', 'web']);
		});

		it('should strip single quotes from items inside a bracketed value', () => {
			expect(parseValue("[react, 'web', 'with space']")).toEqual([
				'react',
				'web',
				'with space'
			]);
		});

		it('should treat an unterminated bracket as a plain string value', () => {
			expect(parseValue('[unfinished')).toEqual('[unfinished');
		});

		it('should return a trimmed plain string when no brackets are present', () => {
			expect(parseValue('  hello  ')).toEqual('hello');
		});

		it('should strip surrounding double quotes from a plain string', () => {
			expect(parseValue('"Quoted Title"')).toEqual('Quoted Title');
		});

		it('should strip surrounding single quotes from a plain string', () => {
			expect(parseValue("'Single'")).toEqual('Single');
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
			expect(slugFromPath('../content/articles/sample-post.md')).toEqual(
				'sample-post'
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

		it('should unwrap inline code', () => {
			const result = stripMarkdown('use `npm install` to start');

			expect(result).toEqual('use npm install to start');
		});

		it('should strip headings, list bullets, blockquotes, and emphasis markers', () => {
			const raw =
				'# Title\n\n> A quote\n\n- one\n- two\n\n*bold* _italic_ ~strike~';
			const result = stripMarkdown(raw);

			expect(result).toEqual('Title A quote one two bold italic strike');
		});

		it('should strip asterisk and plus list bullets alongside dashes', () => {
			const result = stripMarkdown('- one\n* two\n+ three');

			expect(result).toEqual('one two three');
		});

		it('should strip ordered list bullets', () => {
			const result = stripMarkdown('1. first\n2. second\n10. tenth');

			expect(result).toEqual('first second tenth');
		});
	});

	describe('stripQuotes', () => {
		it('should strip surrounding double quotes', () => {
			expect(stripQuotes('"hello"')).toEqual('hello');
		});

		it('should strip surrounding single quotes', () => {
			expect(stripQuotes("'hello'")).toEqual('hello');
		});

		it('should leave mismatched quote pairs intact', () => {
			expect(stripQuotes(`"hello'`)).toEqual(`"hello'`);
			expect(stripQuotes(`'hello"`)).toEqual(`'hello"`);
		});

		it('should leave a value with only one quote intact', () => {
			expect(stripQuotes('"hello')).toEqual('"hello');
			expect(stripQuotes("hello'")).toEqual("hello'");
		});

		it('should trim whitespace when no quotes are present', () => {
			expect(stripQuotes('  hello  ')).toEqual('hello');
		});

		it('should return an empty string for empty input', () => {
			expect(stripQuotes('')).toEqual('');
			expect(stripQuotes('   ')).toEqual('');
		});
	});
});
