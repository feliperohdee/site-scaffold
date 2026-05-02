import '@/app/styles/index.css';

import { StrictMode } from 'react';
import { hydrateRoot } from 'react-dom/client';

import Document from '@/app/document';
import pages from '@/libs/pages';

import type { Route } from '@/libs/router';

const emptyHydration: Route.Hydration = {
	data: null,
	page: 'not-found',
	pathParams: {},
	searchParams: ''
};

const readHydration = (): Route.Hydration => {
	const el = document.getElementById('__data');

	if (!el || !el.textContent) {
		return emptyHydration;
	}

	try {
		const hydration: Route.Hydration = JSON.parse(el.textContent);

		return hydration;
	} catch {
		return emptyHydration;
	}
};

(() => {
	const hydration = readHydration();
	const Component = pages[hydration.page] ?? pages['not-found'];
	const searchParams = new URLSearchParams(hydration.searchParams);

	hydrateRoot(
		document,
		<StrictMode>
			<Document hydration={hydration}>
				<Component
					data={hydration.data}
					pathParams={hydration.pathParams}
					searchParams={searchParams}
				/>
			</Document>
		</StrictMode>
	);
})();
