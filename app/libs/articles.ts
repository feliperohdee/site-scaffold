import _ from 'lodash';
import { marked } from 'marked';

type Article = {
	content: string;
	date: string;
	excerpt: string;
	readingTime: number;
	slug: string;
	tags: string[];
	title: string;
};

type Frontmatter = {
	body: string;
	meta: Record<string, string | string[]>;
};

const modules: Record<string, string> = import.meta.glob(
	'../content/articles/*.md',
	{
		eager: true,
		import: 'default',
		query: '?raw'
	}
);

const buildArticle = (path: string, raw: string): Article => {
	const { body, meta } = parseFrontmatter(raw);
	const fileSlug = slugFromPath(path);
	const excerptOverride = _.isString(meta.excerpt) ? meta.excerpt : null;
	const slug = _.isString(meta.slug) ? meta.slug : fileSlug;
	const tags = _.isArray(meta.tags) ? meta.tags : [];
	const title = _.isString(meta.title) ? meta.title : fileSlug;
	const date = _.isString(meta.date) ? meta.date : '';

	const article: Article = {
		content: body,
		date,
		excerpt: buildExcerpt(body, excerptOverride),
		readingTime: computeReadingTime(body),
		slug,
		tags,
		title
	};

	return article;
};

const buildExcerpt = (markdown: string, override: string | null): string => {
	if (override) {
		return override;
	}

	const stripped = stripMarkdown(markdown);

	if (_.size(stripped) <= 160) {
		return stripped;
	}

	return stripped.slice(0, 157).trimEnd() + '…';
};

const computeReadingTime = (markdown: string): number => {
	const words = _.size(_.compact(markdown.trim().split(/\s+/)));

	return Math.max(1, Math.round(words / 200));
};

const getArticleBySlug = (slug: string): Article | null => {
	return articlesBySlug.get(slug) ?? null;
};

const getArticles = (): Article[] => {
	return articles;
};

const injectHeadingIds = (html: string): string => {
	const seen = new Map<string, number>();

	return html.replace(
		/<h([1-6])>([\s\S]*?)<\/h\1>/g,
		(_match, level, inner) => {
			const base = slugifyHeading(inner);

			if (!base) {
				return `<h${level}>${inner}</h${level}>`;
			}

			const count = seen.get(base) ?? 0;
			seen.set(base, count + 1);
			const id = count === 0 ? base : `${base}-${count}`;

			return `<h${level} id="${id}">${inner}</h${level}>`;
		}
	);
};

const isArticle = (value: unknown): value is Article => {
	return _.isObject(value) && 'slug' in value;
};

const isArticleList = (value: unknown): value is Article[] => {
	return _.isArray(value);
};

const parseFrontmatter = (raw: string): Frontmatter => {
	const match = raw.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/);

	if (!match) {
		const result: Frontmatter = { body: raw, meta: {} };

		return result;
	}

	const meta: Record<string, string | string[]> = {};
	const lines = match[1].split(/\r?\n/);

	_.forEach(lines, line => {
		const colonIndex = line.indexOf(':');

		if (colonIndex === -1) {
			return;
		}

		const key = line.slice(0, colonIndex).trim();
		const value = line.slice(colonIndex + 1);

		if (_.size(key) > 0) {
			meta[key] = parseValue(value);
		}
	});

	const result: Frontmatter = { body: match[2], meta };

	return result;
};

const parseValue = (raw: string): string | string[] => {
	const value = raw.trim();

	if (value.startsWith('[') && value.endsWith(']')) {
		const inner = value.slice(1, -1);
		const items = _.compact(
			_.map(_.split(inner, ','), item => {
				return stripQuotes(item);
			})
		);

		return items;
	}

	return stripQuotes(value);
};

const renderMarkdown = (content: string): string => {
	const html = marked.parse(content, { async: false });

	return _.isString(html) ? injectHeadingIds(html) : '';
};

const slugFromPath = (path: string): string => {
	const file = _.last(path.split('/')) ?? '';

	return file.replace(/\.md$/, '');
};

const slugifyHeading = (text: string): string => {
	return text
		.toLowerCase()
		.replace(/<[^>]+>/g, '')
		.replace(/&[a-z]+;/g, '')
		.replace(/[^a-z0-9\s_-]/g, '')
		.trim()
		.replace(/\s+/g, '-')
		.replace(/-+/g, '-');
};

const stripMarkdown = (markdown: string): string => {
	return markdown
		.replace(/```[\s\S]*?```/g, '')
		.replace(/!\[[^\]]*\]\([^)]*\)/g, '')
		.replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')
		.replace(/`([^`]+)`/g, '$1')
		.replace(/^#{1,6}\s+/gm, '')
		.replace(/^>\s+/gm, '')
		.replace(/^[-*+]\s+/gm, '')
		.replace(/^\d+\.\s+/gm, '')
		.replace(/[*_~]+/g, '')
		.replace(/\r?\n+/g, ' ')
		.trim();
};

const stripQuotes = (value: string): string => {
	const trimmed = value.trim();
	const doubleQuoted = trimmed.startsWith('"') && trimmed.endsWith('"');
	const singleQuoted = trimmed.startsWith("'") && trimmed.endsWith("'");

	if (doubleQuoted || singleQuoted) {
		return trimmed.slice(1, -1);
	}

	return trimmed;
};

const articles: Article[] = _.orderBy(
	_.map(modules, (raw, path) => {
		return buildArticle(path, raw);
	}),
	['date'],
	['desc']
);

const articlesBySlug = new Map(
	_.map(articles, article => {
		return [article.slug, article];
	})
);

export {
	buildArticle,
	buildExcerpt,
	computeReadingTime,
	getArticleBySlug,
	getArticles,
	injectHeadingIds,
	isArticle,
	isArticleList,
	parseFrontmatter,
	parseValue,
	renderMarkdown,
	slugFromPath,
	slugifyHeading,
	stripMarkdown,
	stripQuotes
};
export type { Article };
