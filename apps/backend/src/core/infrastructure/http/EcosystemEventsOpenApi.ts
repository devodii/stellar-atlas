import type { OpenApiRecord } from './OpenApiDocumentProjection.js';

const tags = ['Ecosystem events'];
const slugSchema = { type: 'string', pattern: '^[a-z0-9]+(?:-[a-z0-9]+)*$' };
const githubName = {
	type: 'string',
	pattern: '^(?!\\.{1,2}$)[A-Za-z0-9_.-]{1,100}$'
};
const errorResponse = (description: string) => ({
	description,
	content: {
		'application/json': {
			schema: { $ref: '#/components/schemas/EcosystemEventError' }
		}
	}
});
const unavailable = {
	description:
		'Ecosystem event data is temporarily unavailable. Retry after the indicated delay.',
	headers: {
		'Retry-After': {
			description: 'Seconds to wait before retrying.',
			schema: { type: 'integer', minimum: 0 },
			example: 30
		}
	},
	content: {
		'application/json': {
			schema: { $ref: '#/components/schemas/EcosystemEventError' }
		}
	}
};
const slugParameter = {
	name: 'slug',
	in: 'path',
	required: true,
	description: 'Event slug, for example hackmeridian-2026.',
	schema: slugSchema
};
const repositoryParameters = [
	{
		name: 'owner',
		in: 'path',
		required: true,
		description: 'GitHub owner of the repository.',
		schema: githubName
	},
	{
		name: 'repo',
		in: 'path',
		required: true,
		description: 'GitHub repository name.',
		schema: githubName
	}
];
const okJson = (description: string, schema: string) => ({
	description,
	content: {
		'application/json': {
			schema: { $ref: `#/components/schemas/${schema}` }
		}
	}
});

export const ecosystemEventsPaths: Record<string, unknown> = {
	'/v1/ecosystem-events': {
		get: {
			operationId: 'listEcosystemEvents',
			tags,
			security: [],
			summary: 'List ecosystem events',
			description:
				'Events such as hackathons whose participating projects have been imported, newest first. Each event records the network it ran on, which is not necessarily the network StellarAtlas monitors.',
			responses: {
				'200': okJson('Imported ecosystem events.', 'EcosystemEventList'),
				'503': unavailable
			}
		}
	},
	'/v1/ecosystem-events/{slug}': {
		get: {
			operationId: 'getEcosystemEvent',
			tags,
			security: [],
			summary: 'Get an ecosystem event',
			description:
				'One event with its summary: project counts, tracks, awards and the integrations its projects use.',
			parameters: [slugParameter],
			responses: {
				'200': okJson('The event.', 'EcosystemEvent'),
				'400': errorResponse('The slug is not valid.'),
				'404': errorResponse('No event has this slug.'),
				'503': unavailable
			}
		}
	},
	'/v1/ecosystem-events/{slug}/projects': {
		get: {
			operationId: 'listEcosystemEventProjects',
			tags,
			security: [],
			summary: 'List the projects of an ecosystem event',
			description:
				'Projects ordered with award winners first, then by name. Use nextCursor to continue. Evidence tiers: verified means the repository references an on-chain account, contract or asset that was active during the event; likely means a repository that looks like a submission without on-chain proof.',
			parameters: [
				slugParameter,
				{
					name: 'track',
					in: 'query',
					schema: { type: 'string', enum: ['genesis', 'scale'] }
				},
				{
					name: 'tier',
					in: 'query',
					description: 'Evidence tier.',
					schema: { type: 'string', enum: ['verified', 'likely', 'possible'] }
				},
				{
					name: 'award',
					in: 'query',
					description: 'An award, or any for every awarded project.',
					schema: { type: 'string', enum: ['first', 'runner-up', 'any'] }
				},
				{
					name: 'integration',
					in: 'query',
					description: 'Only projects using this integration partner slug.',
					schema: slugSchema
				},
				{
					name: 'q',
					in: 'query',
					description:
						'Case-insensitive text in name, repository or description.',
					schema: { type: 'string', maxLength: 100 }
				},
				{
					name: 'limit',
					in: 'query',
					schema: { type: 'integer', minimum: 1, maximum: 100, default: 25 }
				},
				{
					name: 'cursor',
					in: 'query',
					description: 'The nextCursor of the previous page.',
					schema: { type: 'string', maxLength: 200 }
				}
			],
			responses: {
				'200': okJson('A page of projects.', 'EcosystemEventProjectPage'),
				'400': errorResponse('A parameter or the cursor is not valid.'),
				'404': errorResponse('No event has this slug.'),
				'503': unavailable
			}
		}
	},
	'/v1/ecosystem-events/{slug}/projects/{owner}/{repo}': {
		get: {
			operationId: 'getEcosystemEventProject',
			tags,
			security: [],
			summary: 'Get one project of an ecosystem event',
			description:
				'The project record with its on-chain evidence, integration evidence, stack and contributors. Chain identifiers belong to the network the event ran on.',
			parameters: [slugParameter, ...repositoryParameters],
			responses: {
				'200': okJson('The project.', 'EcosystemEventProject'),
				'400': errorResponse('A parameter is not valid.'),
				'404': errorResponse('The event or project was not found.'),
				'503': unavailable
			}
		}
	},
	'/v1/repositories/{owner}/{repo}/ecosystem-events': {
		get: {
			operationId: 'listRepositoryEcosystemEvents',
			tags,
			security: [],
			summary: 'List the ecosystem events a repository took part in',
			description:
				'Looks a GitHub repository up across all imported events, case-insensitively. Pair it with the sourceRepository of contract build provenance to show where a contract was first built. An empty list means the repository is in no imported event.',
			parameters: repositoryParameters,
			responses: {
				'200': okJson(
					'The repository and its event participations.',
					'EcosystemRepositoryEvents'
				),
				'400': errorResponse('A parameter is not valid.'),
				'503': unavailable
			}
		}
	}
} satisfies OpenApiRecord;

const track = { type: 'string', enum: ['genesis', 'scale'] };
const award = {
	type: 'string',
	nullable: true,
	enum: ['first', 'runner-up']
};
const tier = { type: 'string', enum: ['verified', 'likely', 'possible'] };
const network = { type: 'string', enum: ['pubnet', 'testnet', 'futurenet'] };
const timestamp = { type: 'string', format: 'date-time' };
const count = { type: 'integer', minimum: 0 };
const nullableString = { type: 'string', nullable: true };
const stringMap = {
	type: 'object',
	additionalProperties: { type: 'string', nullable: true }
};

export const ecosystemEventsSchemas: Record<string, unknown> = {
	EcosystemEventError: {
		type: 'object',
		required: ['code', 'error'],
		properties: {
			code: {
				type: 'string',
				enum: [
					'invalid_ecosystem_event_request',
					'ecosystem_event_not_found',
					'ecosystem_event_project_not_found',
					'ecosystem_events_unavailable'
				]
			},
			error: { type: 'string' }
		}
	},
	EcosystemEventSummary: {
		type: 'object',
		required: [
			'projectCount',
			'verifiedCount',
			'tracks',
			'awards',
			'integrations'
		],
		properties: {
			projectCount: count,
			verifiedCount: count,
			tracks: {
				type: 'object',
				required: ['genesis', 'scale', 'declared'],
				description:
					'declared counts the projects that state their track themselves; the rest are listed as genesis.',
				properties: { genesis: count, scale: count, declared: count }
			},
			awards: {
				type: 'object',
				required: ['first', 'runnerUp'],
				properties: { first: count, runnerUp: count }
			},
			integrations: {
				type: 'array',
				items: {
					type: 'object',
					required: ['slug', 'name', 'projectCount'],
					properties: {
						slug: { type: 'string' },
						name: { type: 'string' },
						projectCount: count
					}
				}
			}
		}
	},
	EcosystemEvent: {
		type: 'object',
		required: [
			'slug',
			'name',
			'network',
			'startsAt',
			'endsAt',
			'sourceUrl',
			'importedAt',
			'summary'
		],
		properties: {
			slug: slugSchema,
			name: { type: 'string' },
			network,
			startsAt: timestamp,
			endsAt: timestamp,
			sourceUrl: { type: 'string', format: 'uri', nullable: true },
			importedAt: timestamp,
			summary: { $ref: '#/components/schemas/EcosystemEventSummary' }
		}
	},
	EcosystemEventList: {
		type: 'object',
		required: ['data'],
		properties: {
			data: {
				type: 'array',
				items: { $ref: '#/components/schemas/EcosystemEvent' }
			}
		}
	},
	EcosystemEventProjectItem: {
		type: 'object',
		required: [
			'event',
			'slug',
			'repository',
			'repositoryUrl',
			'name',
			'description',
			'language',
			'track',
			'trackDeclared',
			'award',
			'evidenceTier',
			'commitsInWindow',
			'contractCount',
			'integrations',
			'links'
		],
		properties: {
			event: slugSchema,
			slug: slugSchema,
			repository: { type: 'string', description: 'GitHub owner/name.' },
			repositoryUrl: { type: 'string', format: 'uri' },
			name: { type: 'string' },
			description: nullableString,
			language: nullableString,
			track,
			trackDeclared: { type: 'boolean' },
			award,
			evidenceTier: tier,
			commitsInWindow: { type: 'integer', minimum: 0, nullable: true },
			contractCount: {
				...count,
				description: 'Contracts deployed during the event on its network.'
			},
			integrations: { type: 'array', items: { type: 'string' } },
			links: {
				type: 'object',
				required: ['self'],
				properties: { self: { type: 'string' } }
			}
		}
	},
	EcosystemEventProjectPage: {
		type: 'object',
		required: ['data', 'nextCursor'],
		properties: {
			data: {
				type: 'array',
				items: { $ref: '#/components/schemas/EcosystemEventProjectItem' }
			},
			nextCursor: { type: 'string', nullable: true }
		}
	},
	EcosystemEventProject: {
		type: 'object',
		required: [
			'event',
			'slug',
			'repository',
			'repositoryUrl',
			'name',
			'homepage',
			'license',
			'topics',
			'createdAt',
			'owner',
			'track',
			'trackDeclared',
			'award',
			'evidenceTier',
			'stack',
			'integrations',
			'chain',
			'contributors',
			'links'
		],
		properties: {
			event: slugSchema,
			slug: slugSchema,
			repository: { type: 'string' },
			repositoryUrl: { type: 'string', format: 'uri' },
			name: { type: 'string' },
			description: nullableString,
			language: nullableString,
			homepage: nullableString,
			license: nullableString,
			topics: { type: 'array', items: { type: 'string' } },
			createdAt: { ...timestamp, nullable: true },
			owner: { type: 'string' },
			track,
			trackDeclared: { type: 'boolean' },
			award,
			evidenceTier: tier,
			commitsInWindow: { type: 'integer', minimum: 0, nullable: true },
			contractCount: count,
			stack: {
				...stringMap,
				description:
					'Stellar package to declared version, null when the manifest gives none.'
			},
			integrations: {
				type: 'array',
				items: { $ref: '#/components/schemas/EcosystemIntegration' }
			},
			chain: { $ref: '#/components/schemas/EcosystemChain' },
			contributors: {
				type: 'array',
				items: {
					type: 'object',
					required: ['login', 'contributions'],
					properties: { login: { type: 'string' }, contributions: count }
				}
			},
			links: {
				type: 'object',
				required: ['self'],
				properties: { self: { type: 'string' } }
			}
		}
	},
	EcosystemIntegration: {
		type: 'object',
		required: ['slug', 'name', 'evidence'],
		properties: {
			slug: { type: 'string' },
			name: { type: 'string' },
			evidence: {
				type: 'array',
				items: {
					type: 'object',
					required: ['method', 'detail', 'fileUrl'],
					properties: {
						method: { type: 'string', enum: ['package', 'endpoint'] },
						detail: { type: 'string' },
						fileUrl: { type: 'string', format: 'uri' }
					}
				}
			}
		}
	},
	EcosystemChain: {
		type: 'object',
		required: [
			'contracts',
			'wasmUploads',
			'classicOps',
			'assets',
			'failedTxs',
			'accounts',
			'evidence'
		],
		properties: {
			contracts: count,
			wasmUploads: count,
			classicOps: count,
			assets: count,
			failedTxs: count,
			accounts: { type: 'array', items: { type: 'string' } },
			evidence: {
				type: 'array',
				items: {
					type: 'object',
					required: ['kind', 'subject', 'method', 'explorerUrl', 'fileUrl'],
					properties: {
						kind: {
							type: 'string',
							enum: ['contract', 'wasm', 'account', 'asset']
						},
						subject: { type: 'string' },
						method: {
							type: 'string',
							enum: [
								'contract_in_repo',
								'wasm_hash_match',
								'wasm_meta',
								'deployer_in_repo',
								'asset_in_repo'
							]
						},
						explorerUrl: { type: 'string', format: 'uri', nullable: true },
						fileUrl: { type: 'string', format: 'uri', nullable: true }
					}
				}
			}
		}
	},
	EcosystemRepositoryEvents: {
		type: 'object',
		required: ['repository', 'data'],
		properties: {
			repository: { type: 'string' },
			data: {
				type: 'array',
				items: {
					type: 'object',
					required: [
						'event',
						'repository',
						'name',
						'track',
						'trackDeclared',
						'award',
						'evidenceTier',
						'links'
					],
					properties: {
						event: {
							type: 'object',
							required: ['slug', 'name', 'network', 'startsAt', 'endsAt'],
							properties: {
								slug: slugSchema,
								name: { type: 'string' },
								network,
								startsAt: timestamp,
								endsAt: timestamp
							}
						},
						repository: { type: 'string' },
						name: { type: 'string' },
						track,
						trackDeclared: { type: 'boolean' },
						award,
						evidenceTier: tier,
						links: {
							type: 'object',
							required: ['project'],
							properties: { project: { type: 'string' } }
						}
					}
				}
			}
		}
	}
} satisfies OpenApiRecord;
