import _ from 'lodash';
import { describe, expect, it } from 'vitest';

import { LANGS, isLang } from '@/libs/lang/types';

describe('@/libs/lang/types', () => {
	describe('LANGS', () => {
		it('should expose the supported language codes', () => {
			expect(LANGS).toEqual([
				'de-de',
				'en-us',
				'es-es',
				'fr-fr',
				'it-it',
				'ja-jp',
				'pt-br'
			]);
		});
	});

	describe('isLang', () => {
		it('should return true for every supported lang', () => {
			_.forEach(LANGS, lang => {
				expect(isLang(lang)).toEqual(true);
			});
		});

		it('should return false for unsupported strings', () => {
			expect(isLang('en')).toEqual(false);
			expect(isLang('zh-cn')).toEqual(false);
			expect(isLang('EN-US')).toEqual(false);
			expect(isLang('')).toEqual(false);
		});

		it('should return false for null', () => {
			expect(isLang(null)).toEqual(false);
		});
	});
});
