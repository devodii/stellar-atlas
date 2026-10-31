import Kernel from '@core/infrastructure/Kernel.js';
import { ConfigMock } from '@core/config/__mocks__/configMock.js';
import { DataSource } from 'typeorm';
import {
	dataset,
	projectDocument
} from '../../../../__tests__/EcosystemEventFixtures.js';
import { createEcosystemEventDataset } from '../../../../domain/EcosystemEventDataset.js';
import { manifest } from '../../../../__tests__/EcosystemEventFixtures.js';
import type { EcosystemEventProjectDocumentDTO } from '../../../../domain/EcosystemEvent.js';
import { TypeOrmEcosystemEventRepository } from '../TypeOrmEcosystemEventRepository.js';

jest.setTimeout(30000);

const doc = (
	slug: string,
	overrides: Partial<EcosystemEventProjectDocumentDTO> = {}
) =>
	projectDocument({
		slug,
		repository: `Team/${slug}`,
		repositoryUrl: `https://github.com/Team/${slug}`,
		name: slug,
		...overrides
	});

describe('TypeOrmEcosystemEventRepository.integration', () => {
	let kernel: Kernel;
	let dataSource: DataSource;
	let repository: TypeOrmEcosystemEventRepository;

	beforeEach(async () => {
		kernel = await Kernel.getInstance(new ConfigMock());
		dataSource = kernel.container.get(DataSource);
		repository = new TypeOrmEcosystemEventRepository(dataSource);
	});

	afterEach(async () => {
		if (kernel !== undefined) await kernel.close();
	});

	describe('importing', () => {
		it('should create the event and its projects', async () => {
			const outcome = await repository.replace(
				dataset([doc('a'), doc('b', { award: 'first' })])
			);

			expect(outcome).toMatchObject({
				slug: 'hackmeridian-2026',
				status: 'created',
				projects: 2,
				changes: { added: 2, retained: 0, removed: 0 }
			});
			expect(await repository.findEvent('hackmeridian-2026')).toMatchObject({
				name: 'HackMeridian 2026',
				network: 'testnet',
				startsAt: '2026-10-25T09:00:00.000Z',
				endsAt: '2026-10-26T12:00:00.000Z',
				summary: { projectCount: 2, awards: { first: 1, runnerUp: 0 } }
			});
		});

		it('should do nothing for a dataset it already holds', async () => {
			const data = dataset([doc('a')]);
			await repository.replace(data);
			const before = (await repository.findEvent('hackmeridian-2026'))!;

			const outcome = await repository.replace(data);

			expect(outcome).toMatchObject({
				status: 'unchanged',
				changes: { added: 0, retained: 1, removed: 0 }
			});
			expect(
				(await repository.findEvent('hackmeridian-2026'))!.importedAt
			).toBe(before.importedAt);
		});

		it('should replace the projects of a changed dataset', async () => {
			await repository.replace(dataset([doc('a'), doc('b'), doc('c')]));

			const outcome = await repository.replace(
				dataset([doc('b', { name: 'renamed' }), doc('c'), doc('d')])
			);

			expect(outcome).toMatchObject({
				status: 'updated',
				projects: 3,
				changes: { added: 1, retained: 2, removed: 1 }
			});
			const page = await repository.listProjects({
				event: 'hackmeridian-2026',
				limit: 10
			});
			expect(page.map((project) => project.slug)).toEqual(['b', 'c', 'd']);
			expect(page[0]!.name).toBe('renamed');
		});

		it('should update the event when only its details change', async () => {
			await repository.replace(dataset([doc('a')]));

			await repository.replace(
				dataset([doc('a')], { name: 'HackMeridian Lisbon' })
			);

			expect((await repository.findEvent('hackmeridian-2026'))!.name).toBe(
				'HackMeridian Lisbon'
			);
		});

		it('should report the stored revision', async () => {
			expect(await repository.findRevision('hackmeridian-2026')).toBeNull();
			const data = dataset([doc('a')]);
			await repository.replace(data);

			expect(await repository.findRevision('hackmeridian-2026')).toBe(
				data.revision
			);
		});

		it('should keep events apart', async () => {
			await repository.replace(dataset([doc('a')]));
			await repository.replace(
				dataset([doc('a'), doc('z')], {
					slug: 'hackmeridian-2027',
					name: '2027',
					startsAt: '2027-10-25T09:00:00.000Z',
					endsAt: '2027-10-26T12:00:00.000Z'
				})
			);

			expect(
				(
					await repository.listProjects({
						event: 'hackmeridian-2026',
						limit: 10
					})
				).map((project) => project.slug)
			).toEqual(['a']);
			expect(
				(await repository.listEvents()).map((event) => event.slug)
			).toEqual(['hackmeridian-2027', 'hackmeridian-2026']);
		});

		it('should survive two imports of the same new event at once', async () => {
			const first = dataset([doc('a'), doc('b')]);
			const second = dataset([doc('c')]);

			const outcomes = await Promise.all([
				repository.replace(first),
				repository.replace(second)
			]);

			expect(outcomes).toHaveLength(2);
			const slugs = (
				await repository.listProjects({ event: 'hackmeridian-2026', limit: 10 })
			).map((project) => project.slug);
			expect([['a', 'b'], ['c']]).toContainEqual(slugs);
			const stored = await repository.findRevision('hackmeridian-2026');
			expect([first.revision, second.revision]).toContain(stored);
		});

		it('should take its projects with it when an event is deleted', async () => {
			await repository.replace(dataset([doc('a'), doc('b')]));

			await dataSource.query(`DELETE FROM "ecosystem_events"`);

			expect(
				await dataSource.query(`SELECT 1 FROM "ecosystem_event_projects"`)
			).toEqual([]);
		});
	});

	describe('constraints', () => {
		it('should not store an award with the wrong rank', async () => {
			await repository.replace(dataset([doc('a')]));

			await expect(
				dataSource.query(
					`UPDATE "ecosystem_event_projects" SET "award" = 'first'`
				)
			).rejects.toThrow(/CHK_ecosystem_event_projects_award/);
		});

		it('should not store an event that ends before it starts', async () => {
			await expect(
				repository.replace(
					dataset([doc('a')], {
						startsAt: '2026-10-26T12:00:00.000Z',
						endsAt: '2026-10-25T09:00:00.000Z'
					})
				)
			).rejects.toThrow(/CHK_ecosystem_events_window/);
		});

		it('should not store the same repository twice in one event, whatever its case', async () => {
			await expect(
				repository.replace(
					dataset([
						doc('a', { repository: 'Team/Same' }),
						doc('b', { repository: 'team/same' })
					])
				)
			).rejects.toThrow(/uq_ecosystem_event_projects_event_repository/);
		});
	});

	describe('listing projects', () => {
		const documents = [
			doc('delta', { track: 'scale', integrations: [] }),
			doc('alpha', { award: 'runner-up' }),
			doc('echo', { evidenceTier: 'likely' }),
			doc('bravo', { award: 'first' }),
			doc('charlie', { award: 'runner-up', description: '100% sure_thing' }),
			doc('foxtrot', {
				integrations: [
					{ slug: 'privy', name: 'Privy', evidence: [] },
					{ slug: 'freighter', name: 'Freighter', evidence: [] }
				]
			})
		];

		beforeEach(async () => {
			await repository.replace(dataset(documents));
		});

		const list = async (
			query: Partial<Parameters<typeof repository.listProjects>[0]> = {}
		) =>
			(
				await repository.listProjects({
					event: 'hackmeridian-2026',
					limit: 20,
					...query
				})
			).map((project) => project.slug);

		it('should list winners first, then runner-ups, then the rest by name', async () => {
			expect(await list()).toEqual([
				'bravo',
				'alpha',
				'charlie',
				'delta',
				'echo',
				'foxtrot'
			]);
		});

		it('should page through everything exactly once with keyset cursors', async () => {
			const seen: string[] = [];
			let cursor: { awardRank: number; slug: string } | undefined;
			for (let guard = 0; guard < 10; guard++) {
				const rows = await repository.listProjects({
					event: 'hackmeridian-2026',
					limit: 2,
					cursor
				});
				if (rows.length === 0) break;
				seen.push(...rows.map((row) => row.slug));
				const last = rows.at(-1)!;
				cursor = {
					awardRank:
						last.award === 'first' ? 0 : last.award === 'runner-up' ? 1 : 2,
					slug: last.slug
				};
			}

			expect(seen).toEqual([
				'bravo',
				'alpha',
				'charlie',
				'delta',
				'echo',
				'foxtrot'
			]);
		});

		it('should continue across the boundary between award groups', async () => {
			expect(
				await list({ cursor: { awardRank: 0, slug: 'bravo' }, limit: 2 })
			).toEqual(['alpha', 'charlie']);
			expect(
				await list({ cursor: { awardRank: 1, slug: 'charlie' }, limit: 1 })
			).toEqual(['delta']);
		});

		it('should filter by track and evidence tier', async () => {
			expect(await list({ track: 'scale' })).toEqual(['delta']);
			expect(await list({ evidenceTier: 'likely' })).toEqual(['echo']);
		});

		it('should filter by award', async () => {
			expect(await list({ award: 'any' })).toEqual([
				'bravo',
				'alpha',
				'charlie'
			]);
			expect(await list({ award: 'first' })).toEqual(['bravo']);
			expect(await list({ award: 'runner-up' })).toEqual(['alpha', 'charlie']);
		});

		it('should filter by integration', async () => {
			expect(await list({ integration: 'privy' })).toEqual(['foxtrot']);
			expect(await list({ integration: 'freighter' })).toEqual([
				'bravo',
				'alpha',
				'charlie',
				'echo',
				'foxtrot'
			]);
			expect(await list({ integration: 'nobody' })).toEqual([]);
		});

		it('should search name, repository and description without case', async () => {
			expect(await list({ search: 'ALPH' })).toEqual(['alpha']);
			expect(await list({ search: 'team/echo' })).toEqual(['echo']);
			expect(await list({ search: 'pays people' })).toHaveLength(5);
		});

		it('should treat % and _ in a search as plain text', async () => {
			expect(await list({ search: '100%' })).toEqual(['charlie']);
			expect(await list({ search: 'sure_thing' })).toEqual(['charlie']);
			expect(await list({ search: '%' })).toEqual(['charlie']);
			expect(await list({ search: 'sure%thing' })).toEqual([]);
		});

		it('should combine filters', async () => {
			expect(
				await list({ award: 'any', search: 'a', evidenceTier: 'verified' })
			).toEqual(['bravo', 'alpha', 'charlie']);
		});

		it('should list nothing for an unknown event', async () => {
			expect(await list({ event: 'nothing' })).toEqual([]);
		});

		it('should expose the fields a list needs and nothing heavy', async () => {
			const [first] = await repository.listProjects({
				event: 'hackmeridian-2026',
				limit: 1
			});

			expect(first).toEqual({
				event: 'hackmeridian-2026',
				slug: 'bravo',
				repository: 'Team/bravo',
				repositoryUrl: 'https://github.com/Team/bravo',
				name: 'bravo',
				description: 'An app that pays people',
				language: 'TypeScript',
				track: 'genesis',
				trackDeclared: false,
				award: 'first',
				evidenceTier: 'verified',
				commitsInWindow: 12,
				contractCount: 2,
				integrations: ['freighter'],
				links: {
					self: '/v1/ecosystem-events/hackmeridian-2026/projects/Team/bravo'
				}
			});
		});
	});

	describe('one project', () => {
		beforeEach(async () => {
			await repository.replace(dataset([doc('alpha')]));
		});

		it('should return the full record, looked up without regard to case', async () => {
			const project = await repository.findProject(
				'hackmeridian-2026',
				'team/alpha'
			);

			expect(project).toMatchObject({
				repository: 'Team/alpha',
				homepage: null,
				createdAt: '2026-10-25T10:00:00.000Z',
				owner: 'Team',
				stack: {
					'@stellar/stellar-sdk': '^14.0.0',
					'unversioned-package': null
				},
				chain: { contracts: 2, accounts: ['GDEPLOYER'] },
				contributors: [{ login: 'ana', contributions: 12 }]
			});
			expect(project!.integrations[0]!.evidence[0]!.method).toBe('package');
			expect(project!.chain.evidence[0]!.method).toBe('deployer_in_repo');
		});

		it('should return null for an unknown project or event', async () => {
			expect(
				await repository.findProject('hackmeridian-2026', 'team/none')
			).toBeNull();
			expect(await repository.findProject('nothing', 'team/alpha')).toBeNull();
		});
	});

	describe('repository participation', () => {
		beforeEach(async () => {
			await repository.replace(
				dataset([doc('alpha', { award: 'first' })], {
					slug: 'hackmeridian-2026'
				})
			);
			await repository.replace(
				createEcosystemEventDataset(
					manifest({
						slug: 'hackmeridian-2027',
						name: 'HackMeridian 2027',
						startsAt: '2027-10-25T09:00:00.000Z',
						endsAt: '2027-10-26T12:00:00.000Z'
					}),
					[doc('alpha', { track: 'scale', trackDeclared: true })]
				)
			);
		});

		it('should list every event a repository took part in, newest first', async () => {
			const events =
				await repository.listRepositoryParticipations('team/alpha');

			expect(events.map((entry) => entry.event.slug)).toEqual([
				'hackmeridian-2027',
				'hackmeridian-2026'
			]);
			expect(events[0]).toMatchObject({
				repository: 'Team/alpha',
				track: 'scale',
				trackDeclared: true,
				award: null,
				event: { network: 'testnet', name: 'HackMeridian 2027' },
				links: {
					project: '/v1/ecosystem-events/hackmeridian-2027/projects/Team/alpha'
				}
			});
			expect(events[1]!.award).toBe('first');
		});

		it('should return nothing for a repository that took part in no event', async () => {
			expect(
				await repository.listRepositoryParticipations('team/none')
			).toEqual([]);
		});
	});
});
