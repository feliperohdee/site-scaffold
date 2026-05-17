import { beforeEach, describe, expect, it, vi } from 'vitest';

import resolveLang from '@/libs/lang/resolve';

const { mockInferLang } = vi.hoisted(() => {
	return {
		mockInferLang: vi.fn()
	};
});

vi.mock('@/libs/lang/infer', () => {
	return { default: mockInferLang };
});

describe('@/libs/lang/resolve', () => {
	describe('resolveLang', () => {
		beforeEach(() => {
			mockInferLang.mockReset().mockReturnValue('en-us');
		});

		it('should return the URL lang when it matches a supported language', () => {
			expect(resolveLang({ country: 'us', urlLang: 'pt-br' })).toEqual(
				'pt-br'
			);
			expect(mockInferLang).not.toHaveBeenCalled();
		});

		it('should fall back to inferLang(country) when urlLang is invalid', () => {
			mockInferLang.mockReturnValue('de-de');

			expect(resolveLang({ country: 'de', urlLang: 'kl-kl' })).toEqual(
				'de-de'
			);
			expect(mockInferLang).toHaveBeenCalledWith('de');
		});

		it('should fall back to inferLang(country) when urlLang is null', () => {
			mockInferLang.mockReturnValue('fr-fr');

			expect(resolveLang({ country: 'fr', urlLang: null })).toEqual(
				'fr-fr'
			);
			expect(mockInferLang).toHaveBeenCalledWith('fr');
		});

		it('should fall back to inferLang(country) when urlLang is empty', () => {
			expect(resolveLang({ country: '', urlLang: '' })).toEqual('en-us');
			expect(mockInferLang).toHaveBeenCalledWith('');
		});
	});
});
