import type { Result } from 'neverthrow';
import type {
	EcosystemEventDatasetDTO,
	EcosystemEventImportOutcomeDTO
} from '../../domain/EcosystemEvent.js';
import type { ImportEcosystemEventDTO } from '../../use-cases/import-ecosystem-event/ImportEcosystemEvent.js';
import { parseEcosystemEventImportCliOptions } from './EcosystemEventImportCliOptions.js';

export interface EcosystemEventImportDependencies {
	readDataset(
		directory: string
	): Promise<Result<EcosystemEventDatasetDTO, Error>>;
	importEvent(
		dto: ImportEcosystemEventDTO
	): Promise<Result<EcosystemEventImportOutcomeDTO, Error>>;
	log(message: string): void;
	error(message: string): void;
}

export async function runEcosystemEventImport(
	args: readonly string[],
	dependencies: EcosystemEventImportDependencies
): Promise<number> {
	try {
		const options = parseEcosystemEventImportCliOptions(args);
		const dataset = await dependencies.readDataset(options.directory);
		if (dataset.isErr()) throw dataset.error;
		if (options.mode === 'check') {
			dependencies.log(describeDataset(dataset.value));

			return 0;
		}

		const outcome = await dependencies.importEvent({
			dataset: dataset.value,
			dryRun: options.mode === 'dry-run'
		});
		if (outcome.isErr()) throw outcome.error;
		dependencies.log(
			describeOutcome(outcome.value, options.mode === 'dry-run')
		);

		return 0;
	} catch (error) {
		dependencies.error(error instanceof Error ? error.message : String(error));

		return 1;
	}
}

export function describeDataset(dataset: EcosystemEventDatasetDTO): string {
	return (
		`${dataset.manifest.slug}: valid, ${dataset.projects.length} projects, ` +
		`revision ${dataset.revision.slice(0, 12)}`
	);
}

export function describeOutcome(
	outcome: EcosystemEventImportOutcomeDTO,
	dryRun: boolean
): string {
	const summary =
		`${outcome.slug}: ${dryRun ? 'would be ' : ''}${outcome.status}, ` +
		`${outcome.projects} projects, revision ${outcome.revision.slice(0, 12)}`;
	if (outcome.changes === null) return summary;
	const { added, retained, removed } = outcome.changes;

	return `${summary}; added ${added}, retained ${retained}, removed ${removed}`;
}
