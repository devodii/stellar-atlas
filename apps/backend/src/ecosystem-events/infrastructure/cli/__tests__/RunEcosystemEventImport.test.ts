import { err, ok } from 'neverthrow';
import type { EcosystemEventImportOutcomeDTO } from '../../../domain/EcosystemEvent.js';
import { dataset } from '../../../__tests__/EcosystemEventFixtures.js';
import {
	runEcosystemEventImport,
	type EcosystemEventImportDependencies
} from '../RunEcosystemEventImport.js';

describe('runEcosystemEventImport', () => {
	const imported = dataset();
	const outcome = (
		overrides: Partial<EcosystemEventImportOutcomeDTO> = {}
	): EcosystemEventImportOutcomeDTO => ({
		slug: 'hackmeridian-2026',
		status: 'created',
		revision: imported.revision,
		projects: 1,
		changes: { added: 1, retained: 0, removed: 0 },
		...overrides
	});
	let logs: string[];
	let errors: string[];
	let dependencies: jest.Mocked<EcosystemEventImportDependencies>;

	beforeEach(() => {
		logs = [];
		errors = [];
		dependencies = {
			readDataset: jest.fn().mockResolvedValue(ok(imported)),
			importEvent: jest.fn().mockResolvedValue(ok(outcome())),
			log: jest.fn((message: string) => logs.push(message)),
			error: jest.fn((message: string) => errors.push(message))
		};
	});

	it('should import the dataset and report what changed', async () => {
		const code = await runEcosystemEventImport(
			['--directory', 'data/2026'],
			dependencies
		);

		expect(code).toBe(0);
		expect(dependencies.readDataset).toHaveBeenCalledWith('data/2026');
		expect(dependencies.importEvent).toHaveBeenCalledWith({
			dataset: imported,
			dryRun: false
		});
		expect(logs).toEqual([
			`hackmeridian-2026: created, 1 projects, revision ${imported.revision.slice(0, 12)}; added 1, retained 0, removed 0`
		]);
	});

	it('should validate without touching the database for --check', async () => {
		const code = await runEcosystemEventImport(
			['--directory', 'd', '--check'],
			dependencies
		);

		expect(code).toBe(0);
		expect(dependencies.importEvent).not.toHaveBeenCalled();
		expect(logs).toEqual([
			`hackmeridian-2026: valid, 1 projects, revision ${imported.revision.slice(0, 12)}`
		]);
	});

	it('should say what a dry run would do and give no change counts', async () => {
		dependencies.importEvent.mockResolvedValue(
			ok(outcome({ status: 'unchanged', changes: null }))
		);

		const code = await runEcosystemEventImport(
			['--directory', 'd', '--dry-run'],
			dependencies
		);

		expect(code).toBe(0);
		expect(dependencies.importEvent).toHaveBeenCalledWith({
			dataset: imported,
			dryRun: true
		});
		expect(logs).toEqual([
			`hackmeridian-2026: would be unchanged, 1 projects, revision ${imported.revision.slice(0, 12)}`
		]);
	});

	it('should exit 1 with the usage text when the arguments are wrong', async () => {
		const code = await runEcosystemEventImport([], dependencies);

		expect(code).toBe(1);
		expect(errors[0]).toContain('--directory is required');
		expect(dependencies.readDataset).not.toHaveBeenCalled();
	});

	it('should exit 1 and list every problem of an invalid dataset, without importing', async () => {
		dependencies.readDataset.mockResolvedValue(
			err(
				new Error(
					'Invalid ecosystem event dataset:\n  nest.yml: track must be one of genesis, scale'
				)
			)
		);

		const code = await runEcosystemEventImport(
			['--directory', 'd'],
			dependencies
		);

		expect(code).toBe(1);
		expect(errors[0]).toContain(
			'nest.yml: track must be one of genesis, scale'
		);
		expect(dependencies.importEvent).not.toHaveBeenCalled();
	});

	it('should exit 1 when the import fails', async () => {
		dependencies.importEvent.mockResolvedValue(
			err(new Error('deadlock detected'))
		);

		const code = await runEcosystemEventImport(
			['--directory', 'd'],
			dependencies
		);

		expect(code).toBe(1);
		expect(errors).toEqual(['deadlock detected']);
		expect(logs).toEqual([]);
	});
});
