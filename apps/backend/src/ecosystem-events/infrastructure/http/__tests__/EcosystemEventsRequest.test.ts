import type { Request } from 'express';
import {
	EcosystemEventRequestError,
	eventSlugPattern,
	githubNamePattern,
	projectListQuery,
	repositoryName
} from '../EcosystemEventsRequest.js';

const request = (
	params: Record<string, string>,
	query: Record<string, unknown> = {}
) => ({ params, query }) as unknown as Request;

describe('EcosystemEventsRequest', () => {
	describe('githubNamePattern', () => {
		it.each([
			'nest',
			'Team',
			'a.b',
			'.github',
			'a_b-c',
			'...',
			'x'.repeat(100)
		])('should accept %s', (name) =>
			expect(githubNamePattern.test(name)).toBe(true)
		);

		it.each([
			'',
			'.',
			'..',
			'a b',
			'a/b',
			'a%2Fb',
			'é',
			'x'.repeat(101),
			'a\nb'
		])('should reject %j', (name) =>
			expect(githubNamePattern.test(name)).toBe(false)
		);
	});

	describe('repositoryName', () => {
		it('should join owner and name', () => {
			expect(repositoryName(request({ owner: 'Team', repo: 'App' }))).toBe(
				'Team/App'
			);
		});

		it.each([
			['.', 'app'],
			['team', '..'],
			['..', '..'],
			['', 'app'],
			['team', '']
		])('should reject owner %j with repo %j', (owner, repo) => {
			expect(() => repositoryName(request({ owner, repo }))).toThrow(
				EcosystemEventRequestError
			);
		});

		it('should reject missing params', () => {
			expect(() => repositoryName(request({}))).toThrow(
				EcosystemEventRequestError
			);
		});
	});

	describe('eventSlugPattern', () => {
		it.each(['hackmeridian-2026', 'a', 'a1-b2'])('should accept %s', (slug) =>
			expect(eventSlugPattern.test(slug)).toBe(true)
		);

		it.each(['', 'A', 'a_b', '-a', 'a-', 'a--b', 'a b', '../x'])(
			'should reject %j',
			(slug) => expect(eventSlugPattern.test(slug)).toBe(false)
		);
	});

	describe('projectListQuery', () => {
		it('should require a valid event slug', () => {
			expect(() => projectListQuery(request({ slug: 'Bad_Slug' }))).toThrow(
				EcosystemEventRequestError
			);
		});

		it('should leave unset filters undefined', () => {
			expect(projectListQuery(request({ slug: 'e' }))).toEqual({
				event: 'e',
				track: undefined,
				evidenceTier: undefined,
				award: undefined,
				integration: undefined,
				search: undefined,
				cursor: undefined,
				limit: undefined
			});
		});

		it('should treat a blank search as no search', () => {
			expect(
				projectListQuery(request({ slug: 'e' }, { q: '   ' })).search
			).toBeUndefined();
		});

		it('should reject a filter given as a list or an object', () => {
			expect(() =>
				projectListQuery(request({ slug: 'e' }, { track: ['a', 'b'] }))
			).toThrow('track must be a single value');
			expect(() =>
				projectListQuery(request({ slug: 'e' }, { q: { $ne: 'x' } }))
			).toThrow('q must be a single value');
		});

		it('should accept the largest page and reject one more', () => {
			expect(
				projectListQuery(request({ slug: 'e' }, { limit: '100' })).limit
			).toBe(100);
			expect(() =>
				projectListQuery(request({ slug: 'e' }, { limit: '101' }))
			).toThrow(/limit must be between 1 and 100/);
		});
	});
});
