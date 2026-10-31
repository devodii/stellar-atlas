'use client';

import { useEffect, useState } from 'react';
import { requestExplorerJson } from '../../api/explorer-analytics';
import styles from './explorer-repository-events.module.css';

export interface RepositoryEvent {
	readonly slug: string;
	readonly name: string;
	readonly network: string;
	readonly award: 'first' | 'runner-up' | null;
	readonly track: 'genesis' | 'scale' | null;
	readonly verified: boolean;
}

const awards = { first: '1st place', 'runner-up': 'Runner-up' } as const;
const tracks = { genesis: 'Genesis', scale: 'Scale' } as const;
const githubName = /^(?!\.{1,2}$)[A-Za-z0-9_.-]{1,100}$/;

function object(value: unknown): Record<string, unknown> | null {
	return typeof value === 'object' && value !== null && !Array.isArray(value)
		? (value as Record<string, unknown>)
		: null;
}

export function repositoryEventsPath(repository: string): string | null {
	const [owner, name, ...rest] = repository.split('/');
	return owner &&
		name &&
		rest.length === 0 &&
		githubName.test(owner) &&
		githubName.test(name)
		? `/v1/repositories/${owner}/${name}/ecosystem-events`
		: null;
}

export function parseRepositoryEvents(
	body: unknown
): readonly RepositoryEvent[] {
	const data = object(body)?.data;
	if (!Array.isArray(data)) return [];

	return data.flatMap((entry: unknown): RepositoryEvent[] => {
		const item = object(entry);
		const event = object(item?.event);
		if (
			!item ||
			!event ||
			typeof event.slug !== 'string' ||
			typeof event.name !== 'string' ||
			typeof event.network !== 'string'
		)
			return [];

		return [
			{
				slug: event.slug,
				name: event.name,
				network: event.network,
				award:
					item.award === 'first' || item.award === 'runner-up'
						? item.award
						: null,
				track:
					item.trackDeclared === true &&
					(item.track === 'genesis' || item.track === 'scale')
						? item.track
						: null,
				verified: item.evidenceTier === 'verified'
			}
		];
	});
}

export function ExplorerRepositoryEventsView({
	events
}: {
	readonly events: readonly RepositoryEvent[];
}): React.JSX.Element | null {
	if (events.length === 0) return null;

	return (
		<div className={styles.events}>
			<h3>Ecosystem events</h3>
			<ul>
				{events.map((event) => (
					<li key={event.slug}>
						<strong>{event.name}</strong>
						<span className={styles.chip}>{event.network}</span>
						{event.award && (
							<span className={styles.award}>{awards[event.award]}</span>
						)}
						{event.track && (
							<span className={styles.chip}>{tracks[event.track]}</span>
						)}
						<span className={styles.muted}>
							{event.verified ? 'On-chain verified' : 'Code only'}
						</span>
					</li>
				))}
			</ul>
			<p className={styles.muted}>
				Event data was imported from the event organizers&apos; dataset. Chain
				activity in it belongs to the event&apos;s network, not this one.
			</p>
		</div>
	);
}

export function ExplorerRepositoryEvents({
	repository
}: {
	readonly repository: string;
}): React.JSX.Element | null {
	const [events, setEvents] = useState<readonly RepositoryEvent[]>([]);
	useEffect(() => {
		const path = repositoryEventsPath(repository);
		if (!path) return;
		const controller = new AbortController();
		requestExplorerJson(path, controller.signal)
			.then((body) => {
				if (!controller.signal.aborted) setEvents(parseRepositoryEvents(body));
			})
			.catch(() => {
				if (!controller.signal.aborted) setEvents([]);
			});
		return () => controller.abort();
	}, [repository]);

	return <ExplorerRepositoryEventsView events={events} />;
}
