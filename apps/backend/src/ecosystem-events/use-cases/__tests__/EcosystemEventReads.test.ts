import { mock } from 'jest-mock-extended';
import type { EcosystemEventRepository } from '../../domain/EcosystemEvent.js';
import { eventDto } from '../../__tests__/EcosystemEventFixtures.js';
import { GetEcosystemEvent } from '../get-ecosystem-event/GetEcosystemEvent.js';
import { GetEcosystemEventProject } from '../get-ecosystem-event-project/GetEcosystemEventProject.js';
import { ListEcosystemEvents } from '../list-ecosystem-events/ListEcosystemEvents.js';
import { ListRepositoryEcosystemEvents } from '../list-repository-ecosystem-events/ListRepositoryEcosystemEvents.js';

describe('ecosystem event reads', () => {
	let repository: ReturnType<typeof mock<EcosystemEventRepository>>;

	beforeEach(() => {
		repository = mock<EcosystemEventRepository>();
	});

	it('should list events', async () => {
		repository.listEvents.mockResolvedValue([eventDto()]);

		const result = await new ListEcosystemEvents(repository).execute();

		expect(result._unsafeUnwrap().data).toEqual([eventDto()]);
	});

	it('should get an event, or null when it is unknown', async () => {
		repository.findEvent.mockResolvedValueOnce(eventDto());
		repository.findEvent.mockResolvedValueOnce(null);
		const useCase = new GetEcosystemEvent(repository);

		expect((await useCase.execute({ slug: 'a' }))._unsafeUnwrap()).toEqual(
			eventDto()
		);
		expect((await useCase.execute({ slug: 'b' }))._unsafeUnwrap()).toBeNull();
	});

	it('should look a project up by its lowercase repository key', async () => {
		repository.findProject.mockResolvedValue(null);

		await new GetEcosystemEventProject(repository).execute({
			event: 'hackmeridian-2026',
			repository: 'Ethan-R13N/Nest'
		});

		expect(repository.findProject).toHaveBeenCalledWith(
			'hackmeridian-2026',
			'ethan-r13n/nest'
		);
	});

	it('should look a repository up case-insensitively and echo the repository asked for', async () => {
		repository.listRepositoryParticipations.mockResolvedValue([]);

		const result = await new ListRepositoryEcosystemEvents(repository).execute({
			repository: 'Ethan-R13N/Nest'
		});

		expect(repository.listRepositoryParticipations).toHaveBeenCalledWith(
			'ethan-r13n/nest'
		);
		expect(result._unsafeUnwrap()).toEqual({
			repository: 'Ethan-R13N/Nest',
			data: []
		});
	});

	it('should turn repository failures into errors', async () => {
		repository.listEvents.mockRejectedValue(new Error('down'));
		repository.findEvent.mockRejectedValue(new Error('down'));
		repository.findProject.mockRejectedValue(new Error('down'));
		repository.listRepositoryParticipations.mockRejectedValue(
			new Error('down')
		);

		expect((await new ListEcosystemEvents(repository).execute()).isErr()).toBe(
			true
		);
		expect(
			(await new GetEcosystemEvent(repository).execute({ slug: 'a' })).isErr()
		).toBe(true);
		expect(
			(
				await new GetEcosystemEventProject(repository).execute({
					event: 'a',
					repository: 'a/b'
				})
			).isErr()
		).toBe(true);
		expect(
			(
				await new ListRepositoryEcosystemEvents(repository).execute({
					repository: 'a/b'
				})
			).isErr()
		).toBe(true);
	});
});
