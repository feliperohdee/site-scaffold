import '@/app/styles/index.css';

import { hydrateRoot } from 'react-dom/client';
import { StrictMode } from 'react';

import Document from '@/app/document';
import matchRoute from '@/app/routes';

const readData = (): unknown => {
	const el = document.getElementById('__data');

	if (!el || !el.textContent) {
		return null;
	}

	try {
		return JSON.parse(el.textContent);
	} catch {
		return null;
	}
};

(() => {
	const url = new URL(window.location.href);
	const { Component, pathParams } = matchRoute(url.pathname);
	const data = readData();

	hydrateRoot(
		document,
		<StrictMode>
			<Document data={data}>
				<Component
					data={data}
					pathParams={pathParams}
					searchParams={url.searchParams}
				/>
			</Document>
		</StrictMode>
	);
})();
