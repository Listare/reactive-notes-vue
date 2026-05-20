/** In-memory only — survives DOM cache restore without a live sandbox. */
const liveSandboxContainers = new WeakSet<HTMLElement>();

export function markContainerSandboxLive(containerEl: HTMLElement): void {
	liveSandboxContainers.add(containerEl);
}

export function clearContainerSandboxLive(containerEl: HTMLElement): void {
	liveSandboxContainers.delete(containerEl);
}

export function isContainerSandboxLive(containerEl: HTMLElement): boolean {
	return liveSandboxContainers.has(containerEl);
}
