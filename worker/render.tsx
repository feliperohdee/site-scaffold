import { renderToReadableStream } from 'react-dom/server';
import { waitUntil } from 'cloudflare:workers';

import Document from '@/app/document';
import R2Cache from '@/worker/r2-cache';
import { DEV } from '@/constants';
import { matchRoute } from '@/app/routes';

const clientEntry = DEV ? '/app/index.tsx' : '/assets/client.js';

const devReactRefreshStub = DEV
	? `window.__vite_plugin_react_preamble_installed__=true;window.$RefreshReg$=()=>{};window.$RefreshSig$=()=>t=>t;`
	: undefined;

const r2cache = new R2Cache({ prefix: 'pages' });

const buildHeaders = () => {
	const headers = new Headers({
		'cache-control': 'public, max-age=300',
		'content-type': 'text/html; charset=utf-8'
	});

	return headers;
};

const renderHtml = async (url: URL): Promise<Response> => {
	const cacheKey = url.toString();
	const cached = await r2cache.match(cacheKey);

	if (cached) {
		return cached;
	}

	const { Component, pathParams } = matchRoute(url.pathname);

	const stream = await renderToReadableStream(
		<Document>
			<Component
				pathParams={pathParams}
				searchParams={url.searchParams}
			/>
		</Document>,
		{
			bootstrapModules: [clientEntry],
			bootstrapScriptContent: devReactRefreshStub,
			onError: err => {
				console.error('SSR render error:', err);
			}
		}
	);

	const [bodyForClient, bodyForCache] = stream.tee();

	waitUntil(
		(async () => {
			const bytes = await new Response(bodyForCache).arrayBuffer();

			await r2cache.put(
				cacheKey,
				new Response(bytes, { headers: buildHeaders() })
			);
		})()
	);

	return new Response(bodyForClient, { headers: buildHeaders() });
};

export default renderHtml;
