import {
	ecosystemChainEvidenceKinds,
	ecosystemChainEvidenceMethods,
	ecosystemEvidenceTiers,
	ecosystemIntegrationMethods,
	ecosystemProjectAwards,
	ecosystemProjectTracks,
	type EcosystemChainDTO,
	type EcosystemChainEvidenceDTO,
	type EcosystemContributorDTO,
	type EcosystemEventProjectDocumentDTO,
	type EcosystemIntegrationDTO
} from '../../domain/EcosystemEvent.js';
import type { DocumentReader } from './DocumentReader.js';

const projectKeys = [
	'event',
	'canonical_id',
	'repo_url',
	'name',
	'description',
	'homepage',
	'language',
	'license',
	'topics',
	'created_at',
	'owner',
	'track',
	'track_declared',
	'award',
	'evidence_tier',
	'commits_in_window',
	'stack',
	'integrations',
	'chain',
	'contributors'
] as const;
const canonicalIdPattern =
	/^pkg:github\/([A-Za-z0-9_.-]{1,100})\/([A-Za-z0-9_.-]{1,100})$/;
const fileSlugPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export function parseEcosystemEventProject(
	raw: unknown,
	fileSlug: string,
	eventSlug: string,
	reader: DocumentReader
): EcosystemEventProjectDocumentDTO {
	const document = reader.object(raw, '', projectKeys);
	if (!fileSlugPattern.test(fileSlug))
		reader.fail('', 'file name must be lowercase words separated by hyphens');
	const event = reader.string(document?.event, 'event');
	if (event && event !== eventSlug)
		reader.fail('event', `must be ${eventSlug}, found ${event}`);

	const canonicalId = reader.string(document?.canonical_id, 'canonical_id');
	const match = canonicalIdPattern.exec(canonicalId);
	if (canonicalId && !match)
		reader.fail('canonical_id', 'must look like pkg:github/<owner>/<repo>');
	const repository = match ? `${match[1]}/${match[2]}` : '';
	const owner = reader.string(document?.owner, 'owner');
	if (match && owner && owner.toLowerCase() !== match[1]!.toLowerCase())
		reader.fail('owner', 'must match the owner in canonical_id');
	const stack = readStack(document?.stack, reader);

	return {
		slug: fileSlug,
		repository,
		repositoryUrl: reader.url(document?.repo_url, 'repo_url'),
		name: reader.string(document?.name, 'name'),
		description: reader.optionalString(document?.description, 'description'),
		homepage: reader.optionalString(document?.homepage, 'homepage'),
		language: reader.optionalString(document?.language, 'language'),
		license: reader.optionalString(document?.license, 'license'),
		topics: reader
			.array(document?.topics, 'topics', true)
			.map((topic, index) => reader.string(topic, `topics[${index}]`)),
		createdAt: reader.optionalTimestamp(document?.created_at, 'created_at'),
		owner,
		track: reader.oneOf(document?.track, 'track', ecosystemProjectTracks),
		trackDeclared: reader.boolean(document?.track_declared, 'track_declared'),
		award: reader.optionalOneOf(
			document?.award,
			'award',
			ecosystemProjectAwards
		),
		evidenceTier: reader.oneOf(
			document?.evidence_tier,
			'evidence_tier',
			ecosystemEvidenceTiers
		),
		commitsInWindow: reader.optionalInteger(
			document?.commits_in_window,
			'commits_in_window'
		),
		stack,
		integrations: reader
			.array(document?.integrations, 'integrations', true)
			.map((item, index) =>
				readIntegration(item, `integrations[${index}]`, reader)
			),
		chain: readChain(document?.chain, reader),
		contributors: reader
			.array(document?.contributors, 'contributors')
			.map((item, index) =>
				readContributor(item, `contributors[${index}]`, reader)
			)
	};
}

function readStack(
	raw: unknown,
	reader: DocumentReader
): Readonly<Record<string, string | null>> {
	if (raw === undefined) return {};
	const stack = reader.object(raw, 'stack');
	const result: Record<string, string | null> = {};
	for (const [name, version] of Object.entries(stack ?? {}))
		result[name] = reader.optionalString(version, `stack.${name}`);

	return result;
}

function readIntegration(
	raw: unknown,
	path: string,
	reader: DocumentReader
): EcosystemIntegrationDTO {
	const item = reader.object(raw, path, ['slug', 'name', 'evidence']);

	return {
		slug: reader.string(item?.slug, `${path}.slug`),
		name: reader.string(item?.name, `${path}.name`),
		evidence: reader
			.array(item?.evidence, `${path}.evidence`)
			.map((entry, index) => {
				const evidencePath = `${path}.evidence[${index}]`;
				const evidence = reader.object(entry, evidencePath, [
					'method',
					'detail',
					'file_url'
				]);

				return {
					method: reader.oneOf(
						evidence?.method,
						`${evidencePath}.method`,
						ecosystemIntegrationMethods
					),
					detail: reader.string(evidence?.detail, `${evidencePath}.detail`),
					fileUrl: reader.url(evidence?.file_url, `${evidencePath}.file_url`)
				};
			})
	};
}

function readChain(raw: unknown, reader: DocumentReader): EcosystemChainDTO {
	const chain = reader.object(raw, 'chain', [
		'contracts',
		'wasm_uploads',
		'classic_ops',
		'assets',
		'failed_txs',
		'accounts',
		'evidence'
	]);

	return {
		contracts: reader.integer(chain?.contracts, 'chain.contracts'),
		wasmUploads: reader.integer(chain?.wasm_uploads, 'chain.wasm_uploads'),
		classicOps: reader.integer(chain?.classic_ops, 'chain.classic_ops'),
		assets: reader.integer(chain?.assets, 'chain.assets'),
		failedTxs: reader.integer(chain?.failed_txs, 'chain.failed_txs'),
		accounts: reader
			.array(chain?.accounts, 'chain.accounts')
			.map((account, index) =>
				reader.string(account, `chain.accounts[${index}]`)
			),
		evidence: reader
			.array(chain?.evidence, 'chain.evidence')
			.map((entry, index) =>
				readChainEvidence(entry, `chain.evidence[${index}]`, reader)
			)
	};
}

function readChainEvidence(
	raw: unknown,
	path: string,
	reader: DocumentReader
): EcosystemChainEvidenceDTO {
	const evidence = reader.object(raw, path, [
		'kind',
		'subject',
		'method',
		'explorer_url',
		'file_url'
	]);

	return {
		kind: reader.oneOf(
			evidence?.kind,
			`${path}.kind`,
			ecosystemChainEvidenceKinds
		),
		subject: reader.string(evidence?.subject, `${path}.subject`),
		method: reader.oneOf(
			evidence?.method,
			`${path}.method`,
			ecosystemChainEvidenceMethods
		),
		explorerUrl: reader.optionalUrl(
			evidence?.explorer_url,
			`${path}.explorer_url`
		),
		fileUrl: reader.optionalUrl(evidence?.file_url, `${path}.file_url`)
	};
}

function readContributor(
	raw: unknown,
	path: string,
	reader: DocumentReader
): EcosystemContributorDTO {
	const contributor = reader.object(raw, path, ['login', 'contributions']);

	return {
		login: reader.string(contributor?.login, `${path}.login`),
		contributions: reader.integer(
			contributor?.contributions,
			`${path}.contributions`
		)
	};
}
