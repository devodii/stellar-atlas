import 'reflect-metadata';
import path from 'node:path';
import Kernel from '@core/infrastructure/Kernel.js';
import { ImportEcosystemEvent } from '../../use-cases/import-ecosystem-event/ImportEcosystemEvent.js';
import { readEcosystemEventDataset } from '../dataset/ReadEcosystemEventDataset.js';
import { runEcosystemEventImport } from './RunEcosystemEventImport.js';

// noinspection JSIgnoredPromiseFromCall
run();

async function run(): Promise<void> {
	let kernel: Kernel | null = null;

	try {
		process.exitCode = await runEcosystemEventImport(process.argv.slice(2), {
			readDataset: (directory) =>
				readEcosystemEventDataset(path.resolve(directory)),
			importEvent: async (dto) => {
				kernel = await Kernel.getInstance();

				return kernel.container.get(ImportEcosystemEvent).execute(dto);
			},
			log: (message) => console.log(message),
			error: (message) => console.error(message)
		});
	} finally {
		if (kernel !== null) await (kernel as Kernel).shutdown();
	}
}
