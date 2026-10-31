import {
	awardRank,
	canonicalJson,
	createEcosystemEventDataset,
	repositoryKey,
	summarizeEcosystemProjects
} from '../EcosystemEventDataset.js';
import {
	manifest,
	projectDocument
} from '../../__tests__/EcosystemEventFixtures.js';

describe('EcosystemEventDataset', () => {
	it('should compare repositories case-insensitively', () => {
		expect(repositoryKey('Team/App')).toBe('team/app');
	});

	it('should rank awards before unawarded projects', () => {
		expect(awardRank('first')).toBe(0);
		expect(awardRank('runner-up')).toBe(1);
		expect(awardRank(null)).toBe(2);
	});

	it('should write the same JSON for the same data whatever the key order', () => {
		expect(canonicalJson({ b: 1, a: { d: 2, c: [{ z: 1, y: 2 }] } })).toBe(
			canonicalJson({ a: { c: [{ y: 2, z: 1 }], d: 2 }, b: 1 })
		);
	});

	describe('summary', () => {
		const projects = [
			projectDocument({ slug: 'a', track: 'genesis', award: 'first' }),
			projectDocument({
				slug: 'b',
				track: 'scale',
				trackDeclared: true,
				award: 'runner-up',
				evidenceTier: 'likely',
				integrations: []
			}),
			projectDocument({ slug: 'c', track: 'genesis', trackDeclared: true })
		];

		it('should count tiers, tracks, awards and declared tracks', () => {
			expect(summarizeEcosystemProjects(projects)).toMatchObject({
				projectCount: 3,
				verifiedCount: 2,
				tracks: { genesis: 2, scale: 1, declared: 2 },
				awards: { first: 1, runnerUp: 1 }
			});
		});

		it('should count projects per integration, most used first', () => {
			expect(summarizeEcosystemProjects(projects).integrations).toEqual([
				{ slug: 'freighter', name: 'Freighter', projectCount: 2 }
			]);
		});

		it('should summarize an empty event', () => {
			expect(summarizeEcosystemProjects([])).toEqual({
				projectCount: 0,
				verifiedCount: 0,
				tracks: { genesis: 0, scale: 0, declared: 0 },
				awards: { first: 0, runnerUp: 0 },
				integrations: []
			});
		});
	});

	describe('revision', () => {
		const documents = [
			projectDocument({ slug: 'a', repository: 'x/a' }),
			projectDocument({ slug: 'b', repository: 'x/b' })
		];

		it('should not depend on the order of the files', () => {
			expect(
				createEcosystemEventDataset(manifest(), [...documents].reverse())
					.revision
			).toBe(createEcosystemEventDataset(manifest(), documents).revision);
		});

		it('should be a sha-256 hex digest', () => {
			expect(
				createEcosystemEventDataset(manifest(), documents).revision
			).toMatch(/^[a-f0-9]{64}$/);
		});

		it('should change when a project changes', () => {
			const changed = [documents[0]!, { ...documents[1]!, name: 'renamed' }];

			expect(
				createEcosystemEventDataset(manifest(), changed).revision
			).not.toBe(createEcosystemEventDataset(manifest(), documents).revision);
		});

		it('should change when the event changes', () => {
			expect(
				createEcosystemEventDataset(manifest({ name: 'Other' }), documents)
					.revision
			).not.toBe(createEcosystemEventDataset(manifest(), documents).revision);
		});

		it('should sort projects by file name', () => {
			expect(
				createEcosystemEventDataset(
					manifest(),
					[...documents].reverse()
				).projects.map((project) => project.slug)
			).toEqual(['a', 'b']);
		});
	});
});
