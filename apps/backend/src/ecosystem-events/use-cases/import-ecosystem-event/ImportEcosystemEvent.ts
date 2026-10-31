import 'reflect-metadata';
import { inject, injectable } from 'inversify';
import { err, ok, Result } from 'neverthrow';
import { mapUnknownToError } from '@core/utilities/mapUnknownToError.js';
import { ECOSYSTEM_EVENT_TYPES } from '../../domain/EcosystemEventTypes.js';
import type {
	EcosystemEventDatasetDTO,
	EcosystemEventDatasetStore,
	EcosystemEventImportOutcomeDTO
} from '../../domain/EcosystemEvent.js';

export interface ImportEcosystemEventDTO {
	readonly dataset: EcosystemEventDatasetDTO;
	readonly dryRun: boolean;
}

@injectable()
export class ImportEcosystemEvent {
	constructor(
		@inject(ECOSYSTEM_EVENT_TYPES.EcosystemEventDatasetStore)
		private readonly store: EcosystemEventDatasetStore
	) {}

	async execute(
		dto: ImportEcosystemEventDTO
	): Promise<Result<EcosystemEventImportOutcomeDTO, Error>> {
		try {
			const { dataset } = dto;
			if (!dto.dryRun) return ok(await this.store.replace(dataset));

			const stored = await this.store.findRevision(dataset.manifest.slug);

			return ok({
				slug: dataset.manifest.slug,
				status:
					stored === null
						? 'created'
						: stored === dataset.revision
							? 'unchanged'
							: 'updated',
				revision: dataset.revision,
				projects: dataset.projects.length,
				changes: null
			});
		} catch (error) {
			return err(mapUnknownToError(error));
		}
	}
}
