import renderHtml from '@/worker/render';

const handler = {
	async fetch(req: Request): Promise<Response> {
		if (req.method !== 'GET' && req.method !== 'HEAD') {
			return new Response('Method not allowed', { status: 405 });
		}

		const url = new URL(req.url);

		try {
			return await renderHtml(url);
		} catch (err) {
			console.error('Worker error:', err);

			return new Response('Internal server error', { status: 500 });
		}
	}
};

export default handler;
