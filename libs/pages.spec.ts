import _ from 'lodash';
import { describe, expect, it } from 'vitest';

import pages from '@/libs/pages';

describe('@/libs/pages', () => {
	it('should auto-register every component file in app/pages and app/pseo/pages keyed by filename', () => {
		expect(_.sortBy(_.keys(pages))).toEqual([
			'article',
			'articles',
			'best-coffee-hub',
			'best-coffee-item',
			'home',
			'not-found',
			'slug'
		]);
	});

	it('should expose each value as a renderable function component', () => {
		_.forEach(_.values(pages), Component => {
			expect(typeof Component).toEqual('function');
		});
	});
});
