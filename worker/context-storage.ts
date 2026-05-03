import resolveLang from '@/libs/lang/resolve';
import type { Lang } from '@/libs/lang/types';

class ContextStorage {
	public lang: Lang;
	public pathParams: Record<string, unknown> = {};
	public request: Request;
	public searchParams: URLSearchParams;
	public url: URL;

	constructor(options: { request: Request }) {
		this.request = options.request;
		this.url = new URL(options.request.url);
		this.searchParams = this.url.searchParams;
		this.lang = resolveLang({
			country: `${this.request.cf?.country ?? ''}`,
			urlLang: this.searchParams.get('_lang')
		});
	}

	setPathParams(pathParams: Record<string, unknown>) {
		this.pathParams = pathParams;
	}

	// Future expansion lives here as plain fields or lazy getters:
	//   public env: Env;
	//   public cookies: Record<string, string>;
	//   public models = { articles: new ArticlesModel(), ... };
	//   async getAccount(...) { ... }    // lazy-loaded helpers
}

export default ContextStorage;
