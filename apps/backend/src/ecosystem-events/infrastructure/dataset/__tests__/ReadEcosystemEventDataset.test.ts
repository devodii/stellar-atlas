import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
	EcosystemEventDatasetError,
	readEcosystemEventDataset
} from '../ReadEcosystemEventDataset.js';

const fixtures = path.join(
	path.dirname(fileURLToPath(import.meta.url)),
	'fixtures',
	'hackmeridian-2026'
);

async function fixture(name: string): Promise<string> {
	return readFile(path.join(fixtures, name), 'utf8');
}

describe('readEcosystemEventDataset', () => {
	const directories: string[] = [];

	async function dataset(files: Record<string, string>): Promise<string> {
		const directory = await mkdtemp(path.join(tmpdir(), 'event-dataset-'));
		directories.push(directory);
		for (const [name, content] of Object.entries(files))
			await writeFile(path.join(directory, name), content);

		return directory;
	}

	async function issuesOf(directory: string): Promise<readonly string[]> {
		const result = await readEcosystemEventDataset(directory);
		expect(result.isErr()).toBe(true);
		if (result.isOk()) throw new Error('expected an invalid dataset');
		expect(result.error).toBeInstanceOf(EcosystemEventDatasetError);

		return result.error.issues;
	}

	afterEach(async () => {
		await Promise.all(
			directories
				.splice(0)
				.map((directory) => rm(directory, { recursive: true, force: true }))
		);
	});

	describe('real HackProof files', () => {
		it('should read the manifest and every project', async () => {
			const result = await readEcosystemEventDataset(fixtures);

			expect(result.isOk()).toBe(true);
			const value = result._unsafeUnwrap();
			expect(value.manifest).toEqual({
				slug: 'hackmeridian-2026',
				name: 'HackMeridian 2026',
				network: 'testnet',
				startsAt: '2026-10-25T09:00:00.000Z',
				endsAt: '2026-10-26T12:00:00.000Z',
				sourceUrl: 'https://github.com/devodii/hackproof'
			});
			expect(value.projects.map((project) => project.slug)).toEqual([
				'nest',
				'payloop',
				'private-yield'
			]);
		});

		it('should map the fields of a project', async () => {
			const value = (await readEcosystemEventDataset(fixtures))._unsafeUnwrap();
			const nest = value.projects.find((project) => project.slug === 'nest')!;

			expect(nest).toMatchObject({
				repository: 'ethan-r13n/nest',
				repositoryUrl: 'https://github.com/ethan-r13n/nest',
				owner: 'ethan-r13n',
				award: 'first',
				track: 'genesis',
				trackDeclared: false,
				evidenceTier: 'verified'
			});
			expect(nest.stack['@stellar/stellar-sdk']).toBe('catalog:');
			expect(nest.integrations.map((item) => item.slug)).toContain('soroswap');
			expect(nest.chain.evidence[0]).toMatchObject({
				kind: 'account',
				method: 'deployer_in_repo'
			});
		});

		it('should summarize the event and fingerprint it', async () => {
			const value = (await readEcosystemEventDataset(fixtures))._unsafeUnwrap();

			expect(value.summary).toMatchObject({
				projectCount: 3,
				awards: { first: 1, runnerUp: 1 },
				tracks: { genesis: 2, scale: 1, declared: 1 }
			});
			expect(value.revision).toMatch(/^[a-f0-9]{64}$/);
		});

		it('should be repeatable', async () => {
			expect(
				(await readEcosystemEventDataset(fixtures))._unsafeUnwrap().revision
			).toBe(
				(await readEcosystemEventDataset(fixtures))._unsafeUnwrap().revision
			);
		});
	});

	describe('invalid datasets', () => {
		it('should fail when the directory cannot be read', async () => {
			expect(await issuesOf(path.join(tmpdir(), 'no-such-event-dir'))).toEqual([
				expect.stringContaining('cannot read')
			]);
		});

		it('should require the manifest', async () => {
			const directory = await dataset({
				'nest.yml': await fixture('nest.yml')
			});

			expect(await issuesOf(directory)).toEqual(['_event.yml: missing']);
		});

		it('should require at least one project file', async () => {
			const directory = await dataset({
				'_event.yml': await fixture('_event.yml')
			});

			expect(await issuesOf(directory)).toEqual([
				expect.stringContaining('found 0')
			]);
		});

		it('should report broken YAML with the file name', async () => {
			const directory = await dataset({
				'_event.yml': await fixture('_event.yml'),
				'broken.yml': 'a: [unclosed'
			});

			expect(await issuesOf(directory)).toEqual([
				expect.stringMatching(/^broken\.yml /)
			]);
		});

		it('should reject YAML aliases', async () => {
			const directory = await dataset({
				'_event.yml': await fixture('_event.yml'),
				'bomb.yml': 'a: &x [1]\nb: *x\n'
			});

			expect(
				(await issuesOf(directory)).some((issue) =>
					issue.startsWith('bomb.yml')
				)
			).toBe(true);
		});

		it('should reject a project of another event', async () => {
			const nest = (await fixture('nest.yml')).replace(
				'event: hackmeridian-2026',
				'event: hackmeridian-2027'
			);
			const directory = await dataset({
				'_event.yml': await fixture('_event.yml'),
				'nest.yml': nest
			});

			expect(await issuesOf(directory)).toEqual([
				'nest.yml: event must be hackmeridian-2026, found hackmeridian-2027'
			]);
		});

		it('should reject unknown keys, so new fields are not silently dropped', async () => {
			const nest = `${await fixture('nest.yml')}stars: 5\n`;
			const directory = await dataset({
				'_event.yml': await fixture('_event.yml'),
				'nest.yml': nest
			});

			expect(await issuesOf(directory)).toEqual([
				'nest.yml: stars is not allowed'
			]);
		});

		it('should report every problem of a file with its path', async () => {
			const nest = (await fixture('nest.yml'))
				.replace('track: genesis', 'track: sideways')
				.replace('award: first', 'award: gold')
				.replace('commits_in_window: 89', 'commits_in_window: -1');
			const directory = await dataset({
				'_event.yml': await fixture('_event.yml'),
				'nest.yml': nest
			});

			expect(await issuesOf(directory)).toEqual([
				'nest.yml: track must be one of genesis, scale',
				'nest.yml: award must be one of first, runner-up',
				'nest.yml: commits_in_window must be a non-negative integer'
			]);
		});

		it('should reject an owner that disagrees with the canonical id', async () => {
			const nest = (await fixture('nest.yml')).replace(
				'owner: ethan-r13n',
				'owner: someone-else'
			);
			const directory = await dataset({
				'_event.yml': await fixture('_event.yml'),
				'nest.yml': nest
			});

			expect(await issuesOf(directory)).toEqual([
				'nest.yml: owner must match the owner in canonical_id'
			]);
		});

		it('should reject non-https links', async () => {
			const nest = (await fixture('nest.yml')).replace(
				'repo_url: https://github.com/ethan-r13n/nest',
				'repo_url: http://github.com/ethan-r13n/nest'
			);
			const directory = await dataset({
				'_event.yml': await fixture('_event.yml'),
				'nest.yml': nest
			});

			expect(await issuesOf(directory)).toEqual([
				'nest.yml: repo_url must be an https URL'
			]);
		});

		it('should reject two files for the same repository, ignoring case', async () => {
			const nest = await fixture('nest.yml');
			const directory = await dataset({
				'_event.yml': await fixture('_event.yml'),
				'nest.yml': nest,
				'nest-copy.yml': nest.replace(
					'pkg:github/ethan-r13n/nest',
					'pkg:github/ETHAN-R13N/nest'
				)
			});

			expect(await issuesOf(directory)).toEqual([
				'nest.yml: canonical_id duplicates nest-copy.yml'
			]);
		});

		it('should reject an event that ends before it starts', async () => {
			const manifest = (await fixture('_event.yml')).replace(
				"ends_at: '2026-10-26T12:00:00Z'",
				"ends_at: '2026-10-24T12:00:00Z'"
			);
			const directory = await dataset({
				'_event.yml': manifest,
				'nest.yml': await fixture('nest.yml')
			});

			expect(await issuesOf(directory)).toEqual([
				'_event.yml: ends_at must be after starts_at'
			]);
		});

		it('should reject an unknown network', async () => {
			const manifest = (await fixture('_event.yml')).replace(
				'network: testnet',
				'network: moonnet'
			);
			const directory = await dataset({
				'_event.yml': manifest,
				'nest.yml': await fixture('nest.yml')
			});

			expect(await issuesOf(directory)).toEqual([
				'_event.yml: network must be one of pubnet, testnet, futurenet'
			]);
		});

		it('should cap how many problems it lists', async () => {
			const files: Record<string, string> = {
				'_event.yml': await fixture('_event.yml')
			};
			for (let index = 0; index < 80; index++)
				files[`broken-${index}.yml`] = 'a: [unclosed';

			const issues = await issuesOf(await dataset(files));

			expect(issues).toHaveLength(51);
			expect(issues.at(-1)).toBe('and 30 more');
		});
	});
});
