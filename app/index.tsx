import '@/app/styles/index.css';

import { hydrateRoot } from 'react-dom/client';
import { StrictMode } from 'react';

import Document from '@/app/document';
import { matchRoute } from '@/app/routes';

(() => {
	const url = new URL(window.location.href);
	const { Component, pathParams } = matchRoute(url.pathname);

	hydrateRoot(
		document,
		<StrictMode>
			<Document>
				<Component
					pathParams={pathParams}
					searchParams={url.searchParams}
				/>
			</Document>
		</StrictMode>
	);
})();
