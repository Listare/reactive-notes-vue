import { normalizeVaultPath } from "../utils/posixPath";
import type { VueBlockChild } from "./VueBlockChild";

const pathToBlocks = new Map<string, Set<VueBlockChild>>();
const blockToPaths = new WeakMap<VueBlockChild, Set<string>>();

export function setVueBlockVaultDependencies(
	block: VueBlockChild,
	paths: string[],
): void {
	clearVueBlockVaultDependencies(block);
	const normalized = paths.map((p) => normalizeVaultPath(p));
	const pathSet = new Set(normalized);
	blockToPaths.set(block, pathSet);
	for (const p of normalized) {
		let blocks = pathToBlocks.get(p);
		if (!blocks) {
			blocks = new Set();
			pathToBlocks.set(p, blocks);
		}
		blocks.add(block);
	}
}

export function clearVueBlockVaultDependencies(block: VueBlockChild): void {
	const prev = blockToPaths.get(block);
	if (!prev) return;
	for (const p of prev) {
		const blocks = pathToBlocks.get(p);
		blocks?.delete(block);
		if (blocks?.size === 0) {
			pathToBlocks.delete(p);
		}
	}
	blockToPaths.delete(block);
}

export function getVueBlocksWatchingVaultPath(
	vaultPath: string,
): VueBlockChild[] {
	const blocks = pathToBlocks.get(normalizeVaultPath(vaultPath));
	return blocks ? [...blocks] : [];
}
