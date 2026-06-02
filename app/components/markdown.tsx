import { useMemo } from 'react';

import { renderMarkdown } from '@/app/libs/articles';

const baseClassName =
	'prose prose-neutral max-w-none prose-headings:tracking-display prose-headings:font-black prose-h1:text-4xl prose-h2:text-3xl prose-h3:text-2xl prose-p:leading-relaxed prose-p:text-neutral-800 prose-a:text-black prose-a:font-medium prose-strong:font-bold prose-pre:rounded-none prose-pre:bg-black prose-pre:text-white prose-pre:overflow-x-auto prose-code:rounded-sm prose-code:bg-neutral-100 prose-code:px-1.5 prose-code:py-0.5 prose-code:font-medium prose-code:before:content-none prose-code:after:content-none [&_pre_code]:bg-transparent [&_pre_code]:text-inherit [&_pre_code]:p-0 [&_pre_code]:rounded-none [&_pre_code]:font-medium prose-blockquote:border-l-4 prose-blockquote:border-black prose-blockquote:font-medium prose-blockquote:not-italic prose-th:border pros e-th:border-neutral-300 prose-th:bg-neutral-100 prose-th:px-3 prose-th:py-2 prose-td:border prose-td:border-neutral-200 prose-td:px-3 prose-td:py-2';

const Markdown = ({
	className,
	content
}: {
	className?: string;
	content: string;
}) => {
	const { html, mergedClassName } = useMemo(() => {
		const html: string = renderMarkdown(content);
		const mergedClassName: string = className
			? `${baseClassName} ${className}`
			: baseClassName;

		return { html, mergedClassName };
	}, [className, content]);

	return (
		<div
			className={mergedClassName}
			dangerouslySetInnerHTML={{ __html: html }}
		/>
	);
};

export default Markdown;
