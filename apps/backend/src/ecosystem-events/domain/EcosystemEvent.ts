export const ecosystemEventNetworks = [
	'pubnet',
	'testnet',
	'futurenet'
] as const;
export const ecosystemProjectTracks = ['genesis', 'scale'] as const;
export const ecosystemProjectAwards = ['first', 'runner-up'] as const;
export const ecosystemEvidenceTiers = [
	'verified',
	'likely',
	'possible'
] as const;
export const ecosystemChainEvidenceKinds = [
	'contract',
	'wasm',
	'account',
	'asset'
] as const;
export const ecosystemChainEvidenceMethods = [
	'contract_in_repo',
	'wasm_hash_match',
	'wasm_meta',
	'deployer_in_repo',
	'asset_in_repo'
] as const;
export const ecosystemIntegrationMethods = ['package', 'endpoint'] as const;

export type EcosystemEventNetwork = (typeof ecosystemEventNetworks)[number];
export type EcosystemProjectTrack = (typeof ecosystemProjectTracks)[number];
export type EcosystemProjectAward = (typeof ecosystemProjectAwards)[number];
export type EcosystemEvidenceTier = (typeof ecosystemEvidenceTiers)[number];
export type EcosystemChainEvidenceKind =
	(typeof ecosystemChainEvidenceKinds)[number];
export type EcosystemChainEvidenceMethod =
	(typeof ecosystemChainEvidenceMethods)[number];
export type EcosystemIntegrationMethod =
	(typeof ecosystemIntegrationMethods)[number];

export interface EcosystemEventSummaryDTO {
	readonly projectCount: number;
	readonly verifiedCount: number;
	readonly tracks: {
		readonly genesis: number;
		readonly scale: number;
		readonly declared: number;
	};
	readonly awards: {
		readonly first: number;
		readonly runnerUp: number;
	};
	readonly integrations: readonly {
		readonly slug: string;
		readonly name: string;
		readonly projectCount: number;
	}[];
}

export interface EcosystemEventDTO {
	readonly slug: string;
	readonly name: string;
	readonly network: EcosystemEventNetwork;
	readonly startsAt: string;
	readonly endsAt: string;
	readonly sourceUrl: string | null;
	readonly importedAt: string;
	readonly summary: EcosystemEventSummaryDTO;
}

export interface EcosystemIntegrationEvidenceDTO {
	readonly method: EcosystemIntegrationMethod;
	readonly detail: string;
	readonly fileUrl: string;
}

export interface EcosystemIntegrationDTO {
	readonly slug: string;
	readonly name: string;
	readonly evidence: readonly EcosystemIntegrationEvidenceDTO[];
}

export interface EcosystemChainEvidenceDTO {
	readonly kind: EcosystemChainEvidenceKind;
	readonly subject: string;
	readonly method: EcosystemChainEvidenceMethod;
	readonly explorerUrl: string | null;
	readonly fileUrl: string | null;
}

export interface EcosystemChainDTO {
	readonly contracts: number;
	readonly wasmUploads: number;
	readonly classicOps: number;
	readonly assets: number;
	readonly failedTxs: number;
	readonly accounts: readonly string[];
	readonly evidence: readonly EcosystemChainEvidenceDTO[];
}

export interface EcosystemContributorDTO {
	readonly login: string;
	readonly contributions: number;
}

export interface EcosystemEventProjectDocumentDTO {
	readonly slug: string;
	readonly repository: string;
	readonly repositoryUrl: string;
	readonly name: string;
	readonly description: string | null;
	readonly homepage: string | null;
	readonly language: string | null;
	readonly license: string | null;
	readonly topics: readonly string[];
	readonly createdAt: string | null;
	readonly owner: string;
	readonly track: EcosystemProjectTrack;
	readonly trackDeclared: boolean;
	readonly award: EcosystemProjectAward | null;
	readonly evidenceTier: EcosystemEvidenceTier;
	readonly commitsInWindow: number | null;
	readonly stack: Readonly<Record<string, string | null>>;
	readonly integrations: readonly EcosystemIntegrationDTO[];
	readonly chain: EcosystemChainDTO;
	readonly contributors: readonly EcosystemContributorDTO[];
}

export interface EcosystemEventProjectItemDTO {
	readonly event: string;
	readonly slug: string;
	readonly repository: string;
	readonly repositoryUrl: string;
	readonly name: string;
	readonly description: string | null;
	readonly language: string | null;
	readonly track: EcosystemProjectTrack;
	readonly trackDeclared: boolean;
	readonly award: EcosystemProjectAward | null;
	readonly evidenceTier: EcosystemEvidenceTier;
	readonly commitsInWindow: number | null;
	readonly contractCount: number;
	readonly integrations: readonly string[];
	readonly links: { readonly self: string };
}

export interface EcosystemEventProjectDetailDTO extends Omit<
	EcosystemEventProjectItemDTO,
	'integrations'
> {
	readonly homepage: string | null;
	readonly license: string | null;
	readonly topics: readonly string[];
	readonly createdAt: string | null;
	readonly owner: string;
	readonly stack: Readonly<Record<string, string | null>>;
	readonly integrations: readonly EcosystemIntegrationDTO[];
	readonly chain: EcosystemChainDTO;
	readonly contributors: readonly EcosystemContributorDTO[];
}

export interface EcosystemRepositoryParticipationDTO {
	readonly event: Pick<
		EcosystemEventDTO,
		'slug' | 'name' | 'network' | 'startsAt' | 'endsAt'
	>;
	readonly repository: string;
	readonly name: string;
	readonly track: EcosystemProjectTrack;
	readonly trackDeclared: boolean;
	readonly award: EcosystemProjectAward | null;
	readonly evidenceTier: EcosystemEvidenceTier;
	readonly links: { readonly project: string };
}

export interface EcosystemEventProjectCursor {
	readonly awardRank: number;
	readonly slug: string;
}

export interface EcosystemEventProjectQuery {
	readonly event: string;
	readonly track?: EcosystemProjectTrack;
	readonly evidenceTier?: EcosystemEvidenceTier;
	readonly award?: EcosystemProjectAward | 'any';
	readonly integration?: string;
	readonly search?: string;
	readonly limit: number;
	readonly cursor?: EcosystemEventProjectCursor;
}

export interface EcosystemEventProjectPageDTO {
	readonly data: readonly EcosystemEventProjectItemDTO[];
	readonly nextCursor: string | null;
}

export interface EcosystemEventManifestDTO {
	readonly slug: string;
	readonly name: string;
	readonly network: EcosystemEventNetwork;
	readonly startsAt: string;
	readonly endsAt: string;
	readonly sourceUrl: string | null;
}

export interface EcosystemEventDatasetDTO {
	readonly manifest: EcosystemEventManifestDTO;
	readonly projects: readonly EcosystemEventProjectDocumentDTO[];
	readonly summary: EcosystemEventSummaryDTO;
	readonly revision: string;
}

export type EcosystemEventImportStatus = 'created' | 'updated' | 'unchanged';

export interface EcosystemEventImportChangesDTO {
	readonly added: number;
	readonly retained: number;
	readonly removed: number;
}

export interface EcosystemEventImportOutcomeDTO {
	readonly slug: string;
	readonly status: EcosystemEventImportStatus;
	readonly revision: string;
	readonly projects: number;
	readonly changes: EcosystemEventImportChangesDTO | null;
}

export interface EcosystemEventRepository {
	listEvents(): Promise<readonly EcosystemEventDTO[]>;
	findEvent(slug: string): Promise<EcosystemEventDTO | null>;
	listProjects(
		query: EcosystemEventProjectQuery
	): Promise<readonly EcosystemEventProjectItemDTO[]>;
	findProject(
		slug: string,
		repositoryKey: string
	): Promise<EcosystemEventProjectDetailDTO | null>;
	listRepositoryParticipations(
		repositoryKey: string
	): Promise<readonly EcosystemRepositoryParticipationDTO[]>;
}

export interface EcosystemEventDatasetStore {
	findRevision(slug: string): Promise<string | null>;
	replace(
		dataset: EcosystemEventDatasetDTO
	): Promise<EcosystemEventImportOutcomeDTO>;
}
