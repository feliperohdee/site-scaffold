import JsonLd from '@/app/components/json-ld';

import type { Route } from '@/libs/router';

// Renders SEO tags + JSON-LD + robots-noindex declared by the route handler.
// Stays silent when a route doesn't declare meta or jsonLd — only the
// noindex tag emits when the route is non-indexable.
const DocumentHead = ({
	indexable,
	jsonLd,
	meta
}: {
	indexable: boolean;
	jsonLd: unknown;
	meta: Route.Meta | null;
}) => {
	if (!meta) {
		return (
			<>
				{!indexable ? (
					<meta
						content='noindex,nofollow'
						name='robots'
					/>
				) : null}
				<JsonLd data={jsonLd} />
			</>
		);
	}

	return (
		<>
			<title>{meta.title}</title>
			<meta
				content={meta.title}
				property='og:title'
			/>
			<meta
				content={meta.ogType ?? 'website'}
				property='og:type'
			/>
			<meta
				content='summary_large_image'
				name='twitter:card'
			/>
			{meta.description ? (
				<meta
					content={meta.description}
					name='description'
				/>
			) : null}
			{meta.description ? (
				<meta
					content={meta.description}
					property='og:description'
				/>
			) : null}
			{meta.image ? (
				<meta
					content={meta.image}
					property='og:image'
				/>
			) : null}
			{meta.canonical ? (
				<link
					href={meta.canonical}
					rel='canonical'
				/>
			) : null}
			{!indexable ? (
				<meta
					content='noindex,nofollow'
					name='robots'
				/>
			) : null}
			<JsonLd data={jsonLd} />
		</>
	);
};

export default DocumentHead;
