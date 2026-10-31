import { mock } from 'jest-mock-extended';
import type {
	EcosystemEventDatasetStore,
	EcosystemEventImportOutcomeDTO
} from '../../domain/EcosystemEvent.js';
import { dataset } from '../../__tests__/EcosystemEventFixtures.js';
import { ImportEcosystemEvent } from '../import-ecosystem-event/ImportEcosystemEvent.js';

describe('ImportEcosystemEvent', () => {
	let store: ReturnType<typeof mock<EcosystemEventDatasetStore>>;
	let useCase: ImportEcosystemEvent;
	const imported = dataset();

	beforeEach(() => {
		store = mock<EcosystemEventDatasetStore>();
		useCase = new ImportEcosystemEvent(store);
	});

	it('should hand the dataset to the store', async () => {
		const outcome: EcosystemEventImportOutcomeDTO = {
			slug: 'hackmeridian-2026',
			status: 'created',
			revision: imported.revision,
			projects: 1,
			changes: { added: 1, retained: 0, removed: 0 }
		};
		store.replace.mockResolvedValue(outcome);

		const result = await useCase.execute({ dataset: imported, dryRun: false });

		expect(result._unsafeUnwrap()).toBe(outcome);
		expect(store.replace).toHaveBeenCalledWith(imported);
	});

	describe('dry run', () => {
		it.each([
			['created', null],
			['unchanged', imported.revision],
			['updated', 'a'.repeat(64)]
		] as const)('should report %s without writing', async (status, stored) => {
			store.findRevision.mockResolvedValue(stored);

			const result = await useCase.execute({ dataset: imported, dryRun: true });

			expect(result._unsafeUnwrap()).toEqual({
				slug: 'hackmeridian-2026',
				status,
				revision: imported.revision,
				projects: 1,
				changes: null
			});
			expect(store.replace).not.toHaveBeenCalled();
		});
	});

	it('should return an error when the store fails', async () => {
		store.replace.mockRejectedValue(new Error('deadlock'));

		const result = await useCase.execute({ dataset: imported, dryRun: false });

		expect(result._unsafeUnwrapErr().message).toBe('deadlock');
	});
});
