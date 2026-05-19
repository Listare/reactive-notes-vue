const SCRIPT_SETUP_RE = /<script\s+([^>]*setup[^>]*)>/i;
const TEMPLATE_RE = /<template[\s>]/i;

export class SfcNormalizeError extends Error {
	constructor(message: string) {
		super(message);
		this.name = "SfcNormalizeError";
	}
}

/**
 * Ensures a valid SFC for vue-interactive blocks: template + script setup, default lang="ts".
 */
export function normalizeSfc(source: string): string {
	const trimmed = source.trim();
	if (!trimmed) {
		throw new SfcNormalizeError("代码块为空。请提供完整的 Vue SFC。");
	}
	if (!TEMPLATE_RE.test(trimmed)) {
		throw new SfcNormalizeError("缺少 <template> 块。");
	}
	if (!SCRIPT_SETUP_RE.test(trimmed)) {
		throw new SfcNormalizeError("缺少 <script setup> 块。");
	}

	return trimmed.replace(SCRIPT_SETUP_RE, (_match, attrs: string) => {
		if (/\blang\s*=/i.test(attrs)) {
			return `<script ${attrs}>`;
		}
		const setupAttrs = attrs.trim();
		return `<script ${setupAttrs} lang="ts">`;
	});
}
