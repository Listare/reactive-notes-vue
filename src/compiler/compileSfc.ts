import {
	parse,
	compileScript,
	compileTemplate,
	compileStyle,
	type SFCDescriptor,
} from "vue/compiler-sfc";
import { normalizeSfc } from "./normalizeSfc";
import { validateScriptImports } from "./rewriteImports";
import { assembleModule } from "./assembleModule";
import { hashScopeId } from "../utils/hashScopeId";

export interface CompiledStyle {
	css: string;
	scoped: boolean;
}

export interface CompileSfcResult {
	scopeId: string;
	moduleCode: string;
	styles: CompiledStyle[];
}

export interface CompileSfcError {
	message: string;
	loc?: { line?: number; column?: number };
}

interface ScriptCompileResult {
	content: string;
	bindings?: object;
	errors?: { message: string }[];
}

function compilerErrorMessage(error: string | { message?: string }): string {
	if (typeof error === "string") return error;
	if (error.message) return error.message;
	return "Unknown compiler error";
}

function formatParseErrors(
	errors: { message: string; loc?: { start?: { line?: number; column?: number } } }[],
): CompileSfcError[] {
	return errors.map((e) => ({
		message: e.message,
		loc: e.loc?.start
			? { line: e.loc.start.line, column: e.loc.start.column }
			: undefined,
	}));
}

function compileStyles(
	descriptor: SFCDescriptor,
	scopeId: string,
): CompiledStyle[] {
	const styles: CompiledStyle[] = [];
	for (const block of descriptor.styles) {
		const result = compileStyle({
			source: block.content,
			filename: "block.vue",
			id: scopeId,
			scoped: block.scoped,
		});
		const styleErrors = result.errors ?? [];
		if (styleErrors.length > 0) {
			const msg = styleErrors.map(compilerErrorMessage).join("\n");
			throw new Error(`样式编译失败: ${msg}`);
		}
		styles.push({ css: result.code, scoped: block.scoped ?? false });
	}
	return styles;
}

function compileDescriptor(
	source: string,
	descriptor: SFCDescriptor,
	scopeId: string,
): CompileSfcResult {
	if (!descriptor.scriptSetup && !descriptor.script) {
		throw new Error("需要 <script setup> 块。");
	}
	if (!descriptor.template) {
		throw new Error("需要 <template> 块。");
	}

	const scriptResult = compileScript(descriptor, {
		id: scopeId,
		inlineTemplate: false,
	}) as unknown as ScriptCompileResult;

	const scriptErrors = scriptResult.errors ?? [];
	if (scriptErrors.length > 0) {
		const msg = scriptErrors.map((e) => e.message).join("\n");
		throw new Error(`脚本编译失败: ${msg}`);
	}

	const templateResult = compileTemplate({
		source: descriptor.template.content,
		filename: "block.vue",
		id: scopeId,
		scoped: descriptor.styles.some((s) => s.scoped),
		ssr: false,
		compilerOptions: {
			bindingMetadata: scriptResult.bindings as never,
		},
	});

	const templateErrors = templateResult.errors ?? [];
	if (templateErrors.length > 0) {
		const msg = templateErrors.map(compilerErrorMessage).join("\n");
		throw new Error(`模板编译失败: ${msg}`);
	}

	const moduleCode = assembleModule({
		scriptContent: scriptResult.content,
		templateCode: templateResult.code,
	});

	const styles = compileStyles(descriptor, scopeId);

	return { scopeId, moduleCode, styles };
}

/** Compiles vue-interactive SFC source to executable module code + scoped CSS. */
export function compileSfc(rawSource: string): CompileSfcResult {
	const normalized = normalizeSfc(rawSource);
	validateScriptImports(normalized);

	const { descriptor, errors } = parse(normalized, {
		filename: "block.vue",
	});

	if (errors.length > 0) {
		const formatted = formatParseErrors(errors);
		const detail = formatted
			.map((e) => {
				const loc =
					e.loc?.line != null
						? ` (${e.loc.line}:${e.loc.column ?? 0})`
						: "";
				return `${e.message}${loc}`;
			})
			.join("\n");
		throw new Error(`SFC 解析失败:\n${detail}`);
	}

	const scopeId = hashScopeId(normalized);
	return compileDescriptor(normalized, descriptor, scopeId);
}
