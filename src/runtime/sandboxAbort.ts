/** Thrown when a sandbox is torn down before init/render completes. */
export class SandboxAbortedError extends Error {
	constructor() {
		super("sandbox aborted");
		this.name = "SandboxAbortedError";
	}
}

export function isSandboxAbortedError(err: unknown): boolean {
	return err instanceof SandboxAbortedError;
}
