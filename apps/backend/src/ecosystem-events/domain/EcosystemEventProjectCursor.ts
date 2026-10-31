import type { EcosystemEventProjectCursor } from './EcosystemEvent.js';

const maxSlugLength = 128;

export function encodeEcosystemEventProjectCursor(
	cursor: EcosystemEventProjectCursor
): string {
	return Buffer.from(JSON.stringify([cursor.awardRank, cursor.slug])).toString(
		'base64url'
	);
}

export function decodeEcosystemEventProjectCursor(
	value: string
): EcosystemEventProjectCursor | null {
	try {
		const parsed: unknown = JSON.parse(
			Buffer.from(value, 'base64url').toString('utf8')
		);
		if (!Array.isArray(parsed) || parsed.length !== 2) return null;
		const [awardRank, slug] = parsed as unknown[];
		if (
			typeof awardRank !== 'number' ||
			!Number.isInteger(awardRank) ||
			awardRank < 0 ||
			awardRank > 2 ||
			typeof slug !== 'string' ||
			slug.length === 0 ||
			slug.length > maxSlugLength
		)
			return null;

		return { awardRank, slug };
	} catch {
		return null;
	}
}
