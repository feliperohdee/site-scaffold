import { handleSitemapRequest } from '@/libs/sitemap';
import context from '@/worker/context';
import ContextStorage from '@/worker/context-storage';
import renderHtml from '@/worker/render';

const handler = {
	async fetch(req: Request): Promise<Response> {
		if (req.method !== 'GET' && req.method !== 'HEAD') {
			return new Response('Method not allowed', { status: 405 });
		}

		return context.run(new ContextStorage({ request: req }), async () => {
			try {
				const url = new URL(req.url);
				const sitemap = await handleSitemapRequest(
					url.pathname,
					url.origin
				);

				if (sitemap) {
					return new Response(sitemap.body, {
						headers: {
							'cache-control': 'public, max-age=300',
							'content-type': sitemap.contentType
						}
					});
				}

				return await renderHtml(req);
			} catch (err) {
				console.error('Worker error:', err);

				return new Response('Internal server error', { status: 500 });
			}
		});
	}
};

export default handler;
