const Head = ({
	description,
	image,
	title,
	url
}: {
	description?: string;
	image?: string;
	title: string;
	url?: string;
}) => {
	return (
		<>
			<title>{title}</title>
			<meta
				property='og:title'
				content={title}
			/>
			<meta
				property='og:type'
				content='website'
			/>
			<meta
				name='twitter:card'
				content='summary_large_image'
			/>
			{description && (
				<meta
					name='description'
					content={description}
				/>
			)}
			{description && (
				<meta
					property='og:description'
					content={description}
				/>
			)}
			{image && (
				<meta
					property='og:image'
					content={image}
				/>
			)}
			{url && (
				<link
					rel='canonical'
					href={url}
				/>
			)}
		</>
	);
};

export default Head;
