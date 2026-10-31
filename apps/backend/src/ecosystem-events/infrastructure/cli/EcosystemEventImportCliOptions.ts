export type EcosystemEventImportMode = 'import' | 'dry-run' | 'check';

export interface EcosystemEventImportCliOptions {
	readonly directory: string;
	readonly mode: EcosystemEventImportMode;
}

export const ecosystemEventImportUsage =
	'Usage: import-ecosystem-event --directory <dataset directory> [--check | --dry-run]\n' +
	'  --check    validate the dataset files only; no database connection\n' +
	'  --dry-run  compare with the database and report; nothing is written';

export function parseEcosystemEventImportCliOptions(
	args: readonly string[]
): EcosystemEventImportCliOptions {
	let directory: string | undefined;
	let mode: EcosystemEventImportMode = 'import';

	for (let index = 0; index < args.length; index++) {
		const argument = args[index]!;
		if (argument === '--directory') {
			directory = args[++index];
			if (!directory || directory.startsWith('--'))
				throw new Error(
					`--directory needs a value\n${ecosystemEventImportUsage}`
				);
		} else if (argument === '--check' || argument === '--dry-run') {
			const next = argument === '--check' ? 'check' : 'dry-run';
			if (mode !== 'import' && mode !== next)
				throw new Error(
					`--check and --dry-run cannot be combined\n${ecosystemEventImportUsage}`
				);
			mode = next;
		} else {
			throw new Error(
				`Unknown option ${argument}\n${ecosystemEventImportUsage}`
			);
		}
	}
	if (!directory)
		throw new Error(`--directory is required\n${ecosystemEventImportUsage}`);

	return { directory, mode };
}
