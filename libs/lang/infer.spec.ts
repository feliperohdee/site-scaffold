import _ from 'lodash';
import { describe, expect, it } from 'vitest';

import inferLang from '@/libs/lang/infer';

describe('@/libs/lang/infer', () => {
	describe('inferLang', () => {
		it('should return language for all mapped countries', () => {
			const expectations: Record<string, string> = {
				ao: 'pt-br',
				ar: 'es-es',
				at: 'de-de',
				au: 'en-us',
				be: 'fr-fr',
				br: 'pt-br',
				ca: 'en-us',
				cd: 'fr-fr',
				ch: 'de-de',
				cl: 'es-es',
				co: 'es-es',
				cr: 'es-es',
				de: 'de-de',
				ec: 'es-es',
				es: 'es-es',
				fr: 'fr-fr',
				gb: 'en-us',
				ie: 'en-us',
				in: 'en-us',
				it: 'it-it',
				jp: 'ja-jp',
				mx: 'es-es',
				nz: 'en-us',
				pe: 'es-es',
				pt: 'pt-br',
				sn: 'fr-fr',
				us: 'en-us',
				ve: 'es-es'
			};

			_.forEach(expectations, (lang, country) => {
				expect(inferLang(country)).toEqual(lang);
			});
		});

		it('should return en-us for unmapped countries', () => {
			expect(inferLang('cn')).toEqual('en-us');
			expect(inferLang('kr')).toEqual('en-us');
			expect(inferLang('zz')).toEqual('en-us');
		});

		it('should return en-us for empty string', () => {
			expect(inferLang('')).toEqual('en-us');
		});

		it('should normalize country code casing before lookup', () => {
			_.forEach(['US', 'us', 'Us'], country => {
				expect(inferLang(country)).toEqual('en-us');
			});
		});
	});
});
