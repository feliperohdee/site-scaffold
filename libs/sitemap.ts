import _ from 'lodash';

namespace Sitemap {
	export type Contributor<T = unknown> = {
		changefreq?: (item: T) => string | null;
		indexable?: (item: T) => boolean;
		lastmod?: (item: T) => string | null;
		list: () => Promise<T[]> | T[];
		name: string;
		priority?: (item: T) => number | null;
		urlFor: (item: T) => string;
		// Override the cache key version segment for /sitemap-<name>.xml.
		// When omitted, the sitemap subroute is uncached.
		version?: () => Promise<string> | string;
	};

	export type Item = {
		changefreq: string | null;
		lastmod: string | null;
		loc: string;
		priority: number | null;
	};
}

const SITEMAP_CHUNK_SIZE = 50000;

const contributors = new Map<string, Sitemap.Contributor<any>>();

// Test-only helper. Production code never clears the registry.
const __resetForTests = (): void => {
	contributors.clear();
};

const absolutize = (origin: string, urlOrPath: string): string => {
	if (/^https?:\/\//i.test(urlOrPath)) {
		return urlOrPath;
	}

	const trimmedOrigin = _.trimEnd(origin, '/');
	const path = urlOrPath.startsWith('/') ? urlOrPath : `/${urlOrPath}`;

	return `${trimmedOrigin}${path}`;
};

const buildRobotsTxt = (origin: string): string => {
	const trimmedOrigin = _.trimEnd(origin, '/');

	return `User-agent: *\nAllow: /\n\nSitemap: ${trimmedOrigin}/sitemap.xml\n`;
};

const buildSitemapForContributor = async <T>(
	contributor: Sitemap.Contributor<T>,
	origin: string,
	chunk: number = 1
): Promise<string> => {
	const all = await resolveContributor(contributor);
	const chunks = _.chunk(all, SITEMAP_CHUNK_SIZE);
	const slice = chunks[chunk - 1] ?? [];
	const urls = _.map(slice, item => {
		return renderUrlEntry(item, origin);
	}).join('\n');

	return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>\n`;
};

const buildSitemapIndex = async (origin: string): Promise<string> => {
	const trimmedOrigin = _.trimEnd(origin, '/');
	const entries: string[] = [];

	for (const contributor of getContributors()) {
		const all = await resolveContributor(contributor);
		const chunkCount = Math.max(
			1,
			Math.ceil(_.size(all) / SITEMAP_CHUNK_SIZE)
		);

		if (chunkCount === 1) {
			entries.push(
				`  <sitemap>\n    <loc>${trimmedOrigin}/sitemap-${escapeXml(contributor.name)}.xml</loc>\n  </sitemap>`
			);
			continue;
		}

		_.forEach(_.range(1, chunkCount + 1), chunk => {
			entries.push(
				`  <sitemap>\n    <loc>${trimmedOrigin}/sitemap-${escapeXml(contributor.name)}-${chunk}.xml</loc>\n  </sitemap>`
			);
		});
	}

	return `<?xml version="1.0" encoding="UTF-8"?>\n<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${entries.join('\n')}\n</sitemapindex>\n`;
};

const escapeXml = (value: string): string => {
	return value
		.replace(/&/g, '&amp;')
		.replace(/</g, '&lt;')
		.replace(/>/g, '&gt;')
		.replace(/"/g, '&quot;')
		.replace(/'/g, '&apos;');
};

const getContributor = (name: string): Sitemap.Contributor | null => {
	return contributors.get(name) ?? null;
};

const getContributors = (): Sitemap.Contributor[] => {
	return Array.from(contributors.values());
};

// Routes the worker entry point should branch on before invoking the React
// render path. Returned shape is `{ body, contentType }` or `null` if the
// pathname doesn't belong to the sitemap surface.
const handleSitemapRequest = async (
	pathname: string,
	origin: string
): Promise<{ body: string; contentType: string } | null> => {
	if (pathname === '/robots.txt') {
		return {
			body: buildRobotsTxt(origin),
			contentType: 'text/plain; charset=utf-8'
		};
	}

	if (pathname === '/sitemap.xml') {
		return {
			body: await buildSitemapIndex(origin),
			contentType: 'application/xml; charset=utf-8'
		};
	}

	const match = pathname.match(/^\/sitemap-([^/]+?)(?:-(\d+))?\.xml$/);

	if (!match) {
		return null;
	}

	const contributor = getContributor(match[1]);

	if (!contributor) {
		return null;
	}

	const chunk = match[2] ? Number.parseInt(match[2], 10) : 1;
	const body = await buildSitemapForContributor(contributor, origin, chunk);

	return {
		body,
		contentType: 'application/xml; charset=utf-8'
	};
};

const registerSitemap = <T>(contributor: Sitemap.Contributor<T>): void => {
	contributors.set(contributor.name, contributor);
};

const renderUrlEntry = (item: Sitemap.Item, origin: string): string => {
	const lines: string[] = [
		`    <loc>${escapeXml(absolutize(origin, item.loc))}</loc>`
	];

	if (item.lastmod) {
		lines.push(`    <lastmod>${escapeXml(item.lastmod)}</lastmod>`);
	}
	if (item.changefreq) {
		lines.push(
			`    <changefreq>${escapeXml(item.changefreq)}</changefreq>`
		);
	}
	if (!_.isNil(item.priority)) {
		lines.push(`    <priority>${item.priority.toFixed(1)}</priority>`);
	}

	return `  <url>\n${lines.join('\n')}\n  </url>`;
};

const resolveContributor = async <T>(
	contributor: Sitemap.Contributor<T>
): Promise<Sitemap.Item[]> => {
	const items = await contributor.list();
	const indexable =
		contributor.indexable ??
		(() => {
			return true;
		});
	const filtered = _.filter(items, item => {
		return indexable(item);
	});

	return _.map(filtered, item => {
		const result: Sitemap.Item = {
			changefreq: contributor.changefreq?.(item) ?? null,
			lastmod: contributor.lastmod?.(item) ?? null,
			loc: contributor.urlFor(item),
			priority: contributor.priority?.(item) ?? null
		};

		return result;
	});
};

export {
	__resetForTests,
	absolutize,
	buildRobotsTxt,
	buildSitemapForContributor,
	buildSitemapIndex,
	escapeXml,
	getContributor,
	getContributors,
	handleSitemapRequest,
	registerSitemap,
	resolveContributor,
	SITEMAP_CHUNK_SIZE
};
export type { Sitemap };
