import { readdir, readFile, stat } from 'node:fs/promises';
import path from 'node:path';
import { err, ok, type Result } from 'neverthrow';
import { parse } from 'yaml';
import { createEcosystemEventDataset } from '../../domain/EcosystemEventDataset.js';
import { repositoryKey } from '../../domain/EcosystemEventDataset.js';
import type {
	EcosystemEventDatasetDTO,
	EcosystemEventProjectDocumentDTO
} from '../../domain/EcosystemEvent.js';
import { DocumentReader } from './DocumentReader.js';
import { parseEcosystemEventManifest } from './EcosystemEventManifestParser.js';
import { parseEcosystemEventProject } from './EcosystemEventProjectParser.js';

export const ecosystemEventManifestFile = '_event.yml';
const maxProjectFiles = 5000;
const maxFileBytes = 1024 * 1024;
const maxReportedIssues = 50;

export class EcosystemEventDatasetError extends Error {
	constructor(readonly issues: readonly string[]) {
		super(
			`Invalid ecosystem event dataset:\n${issues.map((issue) => `  ${issue}`).join('\n')}`
		);
		this.name = 'EcosystemEventDatasetError';
	}
}

export async function readEcosystemEventDataset(
	directory: string
): Promise<Result<EcosystemEventDatasetDTO, EcosystemEventDatasetError>> {
	let names: string[];
	try {
		names = (await readdir(directory)).sort();
	} catch {
		return err(new EcosystemEventDatasetError([`${directory}: cannot read`]));
	}
	const projectFiles = names.filter(
		(name) => name.endsWith('.yml') && name !== ecosystemEventManifestFile
	);
	if (!names.includes(ecosystemEventManifestFile))
		return err(
			new EcosystemEventDatasetError([`${ecosystemEventManifestFile}: missing`])
		);
	if (projectFiles.length === 0 || projectFiles.length > maxProjectFiles)
		return err(
			new EcosystemEventDatasetError([
				`expected 1 to ${maxProjectFiles} project files, found ${projectFiles.length}`
			])
		);

	const issues: string[] = [];
	const manifestReader = new DocumentReader();
	const rawManifest = await readDocument(
		directory,
		ecosystemEventManifestFile,
		manifestReader
	);
	collect(issues, ecosystemEventManifestFile, manifestReader);
	if (issues.length > 0) return err(failure(issues));
	const manifest = parseEcosystemEventManifest(rawManifest, manifestReader);
	collect(issues, ecosystemEventManifestFile, manifestReader);

	const documents: EcosystemEventProjectDocumentDTO[] = [];
	const repositories = new Map<string, string>();
	for (const file of projectFiles) {
		const reader = new DocumentReader();
		const raw = await readDocument(directory, file, reader);
		if (reader.issues.length > 0) {
			collect(issues, file, reader);
			continue;
		}
		const project = parseEcosystemEventProject(
			raw,
			file.slice(0, -'.yml'.length),
			manifest.slug,
			reader
		);
		const key = repositoryKey(project.repository);
		const existing = repositories.get(key);
		if (project.repository && existing)
			reader.fail('canonical_id', `duplicates ${existing}`);
		repositories.set(key, file);
		collect(issues, file, reader);
		documents.push(project);
	}

	if (issues.length > 0) return err(failure(issues));

	return ok(createEcosystemEventDataset(manifest, documents));
}

async function readDocument(
	directory: string,
	file: string,
	reader: DocumentReader
): Promise<unknown> {
	const location = path.join(directory, file);
	try {
		if ((await stat(location)).size > maxFileBytes) {
			reader.fail('', `larger than ${maxFileBytes} bytes`);
			return undefined;
		}
		const document = parse(await readFile(location, 'utf8'), {
			maxAliasCount: 0,
			uniqueKeys: true
		}) as unknown;
		if (
			typeof document !== 'object' ||
			document === null ||
			Array.isArray(document)
		)
			reader.fail('', 'must be a mapping');

		return document;
	} catch (error) {
		reader.fail('', error instanceof Error ? error.message : 'unreadable');

		return undefined;
	}
}

function failure(issues: readonly string[]): EcosystemEventDatasetError {
	return new EcosystemEventDatasetError(
		issues.length > maxReportedIssues
			? [
					...issues.slice(0, maxReportedIssues),
					`and ${issues.length - maxReportedIssues} more`
				]
			: issues
	);
}

function collect(issues: string[], file: string, reader: DocumentReader): void {
	for (const issue of reader.issues)
		issues.push(
			`${file}${issue.path ? `: ${issue.path}` : ''} ${issue.message}`
		);
}
