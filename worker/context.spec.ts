import { describe, expect, it } from 'vitest';

import context from '@/worker/context';
import ContextStorage from '@/worker/context-storage';

const buildStorage = (url = 'https://example.com/') => {
	return new ContextStorage({ request: new Request(url) });
};

describe('@/worker/context', () => {
	describe('run', () => {
		it('should return the value produced by a sync callback', () => {
			const storage = buildStorage();

			const result = context.run(storage, () => {
				return context.store.url.pathname;
			});

			expect(result).toEqual('/');
		});

		it('should return the value produced by an async callback', async () => {
			const storage = buildStorage('https://example.com/articles/hello');

			const result = await context.run(storage, async () => {
				return context.store.url.pathname;
			});

			expect(result).toEqual('/articles/hello');
		});

		it('should override the active store inside a nested run', async () => {
			const outer = buildStorage('https://example.com/outer');
			const inner = buildStorage('https://example.com/inner');

			const result = await context.run(outer, async () => {
				const innerStore = await context.run(inner, async () => {
					return context.store;
				});
				const outerStore = context.store;

				return { innerStore, outerStore };
			});

			expect(result.innerStore).toBe(inner);
			expect(result.outerStore).toBe(outer);
		});

		it('should isolate stores between concurrent runs', async () => {
			const a = buildStorage('https://example.com/a');
			const b = buildStorage('https://example.com/b');

			const [resultA, resultB] = await Promise.all([
				context.run(a, async () => {
					await new Promise(resolve => {
						return setTimeout(resolve, 5);
					});

					return context.store.url.pathname;
				}),
				context.run(b, async () => {
					return context.store.url.pathname;
				})
			]);

			expect(resultA).toEqual('/a');
			expect(resultB).toEqual('/b');
		});
	});

	describe('store', () => {
		it('should throw when called outside of run', () => {
			try {
				void context.store;

				throw new Error('expected to throw');
			} catch (err) {
				expect((err as Error).message).toEqual('No store found');
			}
		});

		it('should expose the active store inside run', async () => {
			const storage = buildStorage();

			const result = await context.run(storage, async () => {
				return context.store;
			});

			expect(result).toBe(storage);
		});

		it('should retain the store across awaits', async () => {
			const storage = buildStorage();

			const result = await context.run(storage, async () => {
				await Promise.resolve();
				await new Promise(resolve => {
					return setTimeout(resolve, 0);
				});

				return context.store;
			});

			expect(result).toBe(storage);
		});
	});
});
