import { describe, expect, it } from 'vitest';

import pages from '@/libs/pages';

describe('@/libs/pages', () => {
	describe('default export', () => {
		it('should auto-register every component file in app/pages keyed by filename', () => {
			expect(Object.keys(pages).sort()).toEqual([
				'article',
				'articles',
				'home',
				'not-found',
				'slug'
			]);
		});

		it('should expose each value as a renderable function component', () => {
			Object.values(pages).forEach(Component => {
				expect(typeof Component).toEqual('function');
			});
		});
	});
});
