import { createEcosystemEventDataset } from '../domain/EcosystemEventDataset.js';
import type {
	EcosystemEventDatasetDTO,
	EcosystemEventDTO,
	EcosystemEventManifestDTO,
	EcosystemEventProjectDocumentDTO,
	EcosystemEventProjectItemDTO
} from '../domain/EcosystemEvent.js';

export function manifest(
	overrides: Partial<EcosystemEventManifestDTO> = {}
): EcosystemEventManifestDTO {
	return {
		slug: 'hackmeridian-2026',
		name: 'HackMeridian 2026',
		network: 'testnet',
		startsAt: '2026-10-25T09:00:00.000Z',
		endsAt: '2026-10-26T12:00:00.000Z',
		sourceUrl: 'https://github.com/devodii/hackproof',
		...overrides
	};
}

export function projectDocument(
	overrides: Partial<EcosystemEventProjectDocumentDTO> = {}
): EcosystemEventProjectDocumentDTO {
	return {
		slug: 'app',
		repository: 'Team/App',
		repositoryUrl: 'https://github.com/Team/App',
		name: 'app',
		description: 'An app that pays people',
		homepage: null,
		language: 'TypeScript',
		license: null,
		topics: ['stellar'],
		createdAt: '2026-10-25T10:00:00.000Z',
		owner: 'Team',
		track: 'genesis',
		trackDeclared: false,
		award: null,
		evidenceTier: 'verified',
		commitsInWindow: 12,
		stack: { '@stellar/stellar-sdk': '^14.0.0', 'unversioned-package': null },
		integrations: [
			{
				slug: 'freighter',
				name: 'Freighter',
				evidence: [
					{
						method: 'package',
						detail: '@stellar/freighter-api',
						fileUrl: 'https://github.com/Team/App/blob/HEAD/package.json'
					}
				]
			}
		],
		chain: {
			contracts: 2,
			wasmUploads: 1,
			classicOps: 0,
			assets: 0,
			failedTxs: 3,
			accounts: ['GDEPLOYER'],
			evidence: [
				{
					kind: 'account',
					subject: 'GDEPLOYER',
					method: 'deployer_in_repo',
					explorerUrl:
						'https://stellar.expert/explorer/testnet/account/GDEPLOYER',
					fileUrl: 'https://github.com/Team/App/blob/HEAD/README.md'
				}
			]
		},
		contributors: [{ login: 'ana', contributions: 12 }],
		...overrides
	};
}

export function dataset(
	documents: readonly EcosystemEventProjectDocumentDTO[] = [projectDocument()],
	overrides: Partial<EcosystemEventManifestDTO> = {}
): EcosystemEventDatasetDTO {
	return createEcosystemEventDataset(manifest(overrides), documents);
}

export function eventDto(
	overrides: Partial<EcosystemEventDTO> = {}
): EcosystemEventDTO {
	const { manifest: base, summary } = dataset();

	return {
		...base,
		importedAt: '2026-10-31T15:00:00.000Z',
		summary,
		...overrides
	};
}

export function projectItem(
	overrides: Partial<EcosystemEventProjectItemDTO> = {}
): EcosystemEventProjectItemDTO {
	return {
		event: 'hackmeridian-2026',
		slug: 'app',
		repository: 'Team/App',
		repositoryUrl: 'https://github.com/Team/App',
		name: 'app',
		description: 'An app that pays people',
		language: 'TypeScript',
		track: 'genesis',
		trackDeclared: false,
		award: null,
		evidenceTier: 'verified',
		commitsInWindow: 12,
		contractCount: 2,
		integrations: ['freighter'],
		links: { self: '/v1/ecosystem-events/hackmeridian-2026/projects/Team/App' },
		...overrides
	};
}
