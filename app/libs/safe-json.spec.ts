import { describe, expect, it } from 'vitest';

import safeJsonStringify from '@/app/libs/safe-json';

describe('@/app/libs/safe-json', () => {
	describe('safeJsonStringify', () => {
		it('should serialize a plain object', () => {
			const result = safeJsonStringify({ a: 1, b: 'two' });

			expect(result).toEqual('{"a":1,"b":"two"}');
		});

		it('should escape < to prevent breaking out of a script tag', () => {
			const result = safeJsonStringify({
				html: '</script><script>alert(1)</script>'
			});

			expect(result).not.toContain('</script>');
			expect(result).toContain('\\u003c');
		});

		it('should escape > and & alongside <', () => {
			const result = safeJsonStringify({ x: '<>&' });

			expect(result).toContain('\\u003c');
			expect(result).toContain('\\u003e');
			expect(result).toContain('\\u0026');
		});

		it('should escape U+2028 and U+2029 line separators', () => {
			const result = safeJsonStringify({ x: 'a b c' });

			expect(result).toContain('\\u2028');
			expect(result).toContain('\\u2029');
			expect(result).not.toContain(' ');
			expect(result).not.toContain(' ');
		});

		it('should serialize null when given undefined', () => {
			const result = safeJsonStringify(undefined);

			expect(result).toEqual('null');
		});

		it('should round-trip through JSON.parse', () => {
			const input = { tag: '<a>', text: 'a&b' };
			const result = safeJsonStringify(input);

			expect(JSON.parse(result)).toEqual(input);
		});
	});
});
