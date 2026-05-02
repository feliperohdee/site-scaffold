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

const stripQuotes = (value: string): string => {
	const trimmed = value.trim();
	const doubleQuoted = trimmed.startsWith('"') && trimmed.endsWith('"');
	const singleQuoted = trimmed.startsWith("'") && trimmed.endsWith("'");

	if (doubleQuoted || singleQuoted) {
		return trimmed.slice(1, -1);
	}

	return trimmed;
};

const parseValue = (raw: string): string | string[] => {
	const value = raw.trim();

	if (value.startsWith('[') && value.endsWith(']')) {
		const inner = value.slice(1, -1);
		const items = inner
			.split(',')
			.map(item => {
				return stripQuotes(item);
			})
			.filter(item => {
				return _.size(item) > 0;
			});

		return items;
	}

	return stripQuotes(value);
};

const parseFrontmatter = (raw: string): Frontmatter => {
	const match = raw.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/);

	if (!match) {
		const result: Frontmatter = { body: raw, meta: {} };

		return result;
	}

	const meta: Record<string, string | string[]> = {};
	const lines = match[1].split(/\r?\n/);

	for (const line of lines) {
		const colonIndex = line.indexOf(':');

		if (colonIndex === -1) {
			continue;
		}

		const key = line.slice(0, colonIndex).trim();
		const value = line.slice(colonIndex + 1);

		if (_.size(key) > 0) {
			meta[key] = parseValue(value);
		}
	}

	const result: Frontmatter = { body: match[2], meta };

	return result;
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

const slugFromPath = (path: string): string => {
	const file = _.last(path.split('/')) ?? '';

	return file.replace(/\.md$/, '');
};

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

const articles: Article[] = _.orderBy(
	_.map(modules, (raw, path) => {
		return buildArticle(path, raw);
	}),
	['date'],
	['desc']
);

const articlesBySlug = new Map(
	articles.map(article => {
		return [article.slug, article];
	})
);

const getArticles = (): Article[] => {
	return articles;
};

const getArticleBySlug = (slug: string): Article | null => {
	return articlesBySlug.get(slug) ?? null;
};

const renderMarkdown = (content: string): string => {
	const html = marked.parse(content, { async: false });

	return _.isString(html) ? html : '';
};

export {
	buildExcerpt,
	computeReadingTime,
	getArticleBySlug,
	getArticles,
	parseFrontmatter,
	renderMarkdown,
	slugFromPath,
	stripMarkdown
};
export type { Article };
