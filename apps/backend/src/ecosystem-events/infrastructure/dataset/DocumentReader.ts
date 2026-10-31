export interface DocumentIssue {
	readonly path: string;
	readonly message: string;
}

type PlainObject = Readonly<Record<string, unknown>>;

export class DocumentReader {
	private readonly found: DocumentIssue[] = [];

	get issues(): readonly DocumentIssue[] {
		return this.found;
	}

	fail(path: string, message: string): void {
		this.found.push({ path, message });
	}

	object(value: unknown, path: string, allowed?: readonly string[]) {
		if (typeof value !== 'object' || value === null || Array.isArray(value)) {
			this.fail(path, 'must be a mapping');
			return null;
		}
		const record = value as PlainObject;
		if (allowed)
			for (const key of Object.keys(record))
				if (!allowed.includes(key))
					this.fail(`${path}.${key}`.replace(/^\./, ''), 'is not allowed');

		return record;
	}

	string(value: unknown, path: string): string {
		if (typeof value === 'string' && value.trim().length > 0) return value;
		this.fail(path, 'must be a non-empty string');

		return '';
	}

	optionalString(value: unknown, path: string): string | null {
		if (value === undefined || value === null) return null;

		return this.string(value, path) || null;
	}

	integer(value: unknown, path: string): number {
		if (typeof value === 'number' && Number.isSafeInteger(value) && value >= 0)
			return value;
		this.fail(path, 'must be a non-negative integer');

		return 0;
	}

	optionalInteger(value: unknown, path: string): number | null {
		if (value === undefined || value === null) return null;

		return this.integer(value, path);
	}

	boolean(value: unknown, path: string): boolean {
		if (typeof value === 'boolean') return value;
		this.fail(path, 'must be a boolean');

		return false;
	}

	timestamp(value: unknown, path: string): string {
		const text = value instanceof Date ? value.toISOString() : value;
		if (typeof text === 'string' && !Number.isNaN(Date.parse(text)))
			return new Date(text).toISOString();
		this.fail(path, 'must be an ISO 8601 timestamp');

		return '';
	}

	optionalTimestamp(value: unknown, path: string): string | null {
		if (value === undefined || value === null) return null;

		return this.timestamp(value, path) || null;
	}

	url(value: unknown, path: string): string {
		const text = this.string(value, path);
		if (text && !/^https:\/\/[^\s]+$/.test(text))
			this.fail(path, 'must be an https URL');

		return text;
	}

	optionalUrl(value: unknown, path: string): string | null {
		if (value === undefined || value === null) return null;

		return this.url(value, path) || null;
	}

	oneOf<T extends string>(
		value: unknown,
		path: string,
		allowed: readonly T[]
	): T {
		if (
			typeof value === 'string' &&
			(allowed as readonly string[]).includes(value)
		)
			return value as T;
		this.fail(path, `must be one of ${allowed.join(', ')}`);

		return allowed[0] as T;
	}

	optionalOneOf<T extends string>(
		value: unknown,
		path: string,
		allowed: readonly T[]
	): T | null {
		if (value === undefined || value === null) return null;

		return this.oneOf(value, path, allowed);
	}

	array(value: unknown, path: string, optional = false): readonly unknown[] {
		if (value === undefined && optional) return [];
		if (Array.isArray(value)) return value;
		this.fail(path, 'must be a list');

		return [];
	}
}
