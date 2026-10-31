import { createHash } from 'node:crypto';
import type {
	EcosystemEventDatasetDTO,
	EcosystemEventManifestDTO,
	EcosystemEventProjectDocumentDTO,
	EcosystemEventSummaryDTO,
	EcosystemProjectAward
} from './EcosystemEvent.js';

const awardRanks: Readonly<Record<EcosystemProjectAward, number>> = {
	first: 0,
	'runner-up': 1
};
const unawardedRank = 2;

export function repositoryKey(repository: string): string {
	return repository.toLowerCase();
}

export function awardRank(award: EcosystemProjectAward | null): number {
	return award === null ? unawardedRank : awardRanks[award];
}

export function summarizeEcosystemProjects(
	projects: readonly EcosystemEventProjectDocumentDTO[]
): EcosystemEventSummaryDTO {
	const integrations = new Map<
		string,
		{ name: string; projectCount: number }
	>();
	let genesis = 0;
	let declared = 0;
	let verifiedCount = 0;
	let first = 0;
	let runnerUp = 0;

	for (const project of projects) {
		if (project.track === 'genesis') genesis++;
		if (project.trackDeclared) declared++;
		if (project.evidenceTier === 'verified') verifiedCount++;
		if (project.award === 'first') first++;
		if (project.award === 'runner-up') runnerUp++;
		for (const integration of project.integrations) {
			const current = integrations.get(integration.slug);
			if (current) current.projectCount++;
			else
				integrations.set(integration.slug, {
					name: integration.name,
					projectCount: 1
				});
		}
	}

	return {
		projectCount: projects.length,
		verifiedCount,
		tracks: { genesis, scale: projects.length - genesis, declared },
		awards: { first, runnerUp },
		integrations: [...integrations]
			.map(([slug, value]) => ({ slug, ...value }))
			.sort(
				(a, b) =>
					b.projectCount - a.projectCount || a.slug.localeCompare(b.slug)
			)
	};
}

export function canonicalJson(value: unknown): string {
	return JSON.stringify(value, (_key, nested: unknown) => {
		if (nested === null || typeof nested !== 'object' || Array.isArray(nested))
			return nested;

		return Object.fromEntries(
			Object.entries(nested).sort(([a], [b]) => a.localeCompare(b))
		);
	});
}

export function createEcosystemEventDataset(
	manifest: EcosystemEventManifestDTO,
	documents: readonly EcosystemEventProjectDocumentDTO[]
): EcosystemEventDatasetDTO {
	const projects = [...documents].sort((a, b) => a.slug.localeCompare(b.slug));

	return {
		manifest,
		projects,
		summary: summarizeEcosystemProjects(projects),
		revision: createHash('sha256')
			.update(canonicalJson({ manifest, projects }))
			.digest('hex')
	};
}
