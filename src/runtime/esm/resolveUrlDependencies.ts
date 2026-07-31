import { isUrlImportSpecifier } from "../../resolver/isUrlImport";

/** Recovers CDN URLs from emitted module code (e.g. older disk cache without urlDependencies). */
export function extractUrlDependenciesFromModuleCode(
	moduleCode: string,
): string[] {
	const urls = new Set<string>();
	const re = /__importUrl__\(\s*["']([^"']+)["']\s*\)/g;
	let match: RegExpExecArray | null;
	while ((match = re.exec(moduleCode)) !== null) {
		const spec = match[1];
		if (spec && isUrlImportSpecifier(spec)) {
			urls.add(spec);
		}
	}
	return [...urls];
}

export function resolveUrlDependencies(options: {
	urlDependencies?: string[];
	moduleCode: string;
}): string[] {
	if (options.urlDependencies && options.urlDependencies.length > 0) {
		return options.urlDependencies;
	}
	return extractUrlDependenciesFromModuleCode(options.moduleCode);
}
