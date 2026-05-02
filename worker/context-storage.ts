class ContextStorage {
	public pathParams: Record<string, unknown> = {};
	public request: Request;
	public searchParams: URLSearchParams;
	public url: URL;

	constructor(options: { request: Request }) {
		this.request = options.request;
		this.url = new URL(options.request.url);
		this.searchParams = this.url.searchParams;
	}

	// Future expansion lives here as plain fields or lazy getters:
	//   public env: Env;
	//   public lang: SupportedLang;
	//   public cookies: Record<string, string>;
	//   public models = { articles: new ArticlesModel(), ... };
	//   async getAccount(...) { ... }    // lazy-loaded helpers
}

export default ContextStorage;
