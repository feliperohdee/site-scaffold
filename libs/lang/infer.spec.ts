import { describe, expect, it } from 'vitest';

import inferLang from '@/libs/lang/infer';

describe('@/libs/lang/infer', () => {
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

		for (const [country, lang] of Object.entries(expectations)) {
			expect(inferLang(country)).toEqual(lang);
		}
	});

	it('should return en-us for unmapped countries', () => {
		expect(inferLang('cn')).toEqual('en-us');
		expect(inferLang('kr')).toEqual('en-us');
		expect(inferLang('zz')).toEqual('en-us');
	});

	it('should return en-us for empty string', () => {
		expect(inferLang('')).toEqual('en-us');
	});

	it('should handle uppercase input', () => {
		expect(inferLang('US')).toEqual('en-us');
		expect(inferLang('BR')).toEqual('pt-br');
		expect(inferLang('FR')).toEqual('fr-fr');
	});

	it('should handle lowercase input', () => {
		expect(inferLang('us')).toEqual('en-us');
		expect(inferLang('br')).toEqual('pt-br');
		expect(inferLang('fr')).toEqual('fr-fr');
	});

	it('should handle mixed case input', () => {
		expect(inferLang('Us')).toEqual('en-us');
		expect(inferLang('Br')).toEqual('pt-br');
		expect(inferLang('Fr')).toEqual('fr-fr');
	});
});
