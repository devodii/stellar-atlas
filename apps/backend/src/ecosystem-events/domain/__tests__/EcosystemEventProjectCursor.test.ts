import {
	decodeEcosystemEventProjectCursor,
	encodeEcosystemEventProjectCursor
} from '../EcosystemEventProjectCursor.js';

describe('EcosystemEventProjectCursor', () => {
	it('should round-trip a cursor', () => {
		const cursor = { awardRank: 1, slug: 'private-yield' };

		expect(
			decodeEcosystemEventProjectCursor(
				encodeEcosystemEventProjectCursor(cursor)
			)
		).toEqual(cursor);
	});

	it.each([
		['not base64 json', '%%%'],
		['not a pair', Buffer.from('[1]').toString('base64url')],
		['an object', Buffer.from('{"a":1}').toString('base64url')],
		['a rank out of range', Buffer.from('[3,"a"]').toString('base64url')],
		['a negative rank', Buffer.from('[-1,"a"]').toString('base64url')],
		['a fractional rank', Buffer.from('[1.5,"a"]').toString('base64url')],
		['an empty slug', Buffer.from('[0,""]').toString('base64url')],
		['a non-string slug', Buffer.from('[0,5]').toString('base64url')],
		[
			'an oversized slug',
			Buffer.from(JSON.stringify([0, 'a'.repeat(129)])).toString('base64url')
		]
	])('should reject %s', (_name, value) => {
		expect(decodeEcosystemEventProjectCursor(value)).toBeNull();
	});
});
