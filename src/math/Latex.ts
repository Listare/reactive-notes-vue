import {
	defineComponent,
	h,
	onMounted,
	ref,
	watch,
	type PropType,
} from "vue";
import { renderLatexToHtml } from "./renderLatex";

/** Renders a LaTeX string with MathJax when `latex` changes. */
export const Latex = defineComponent({
	name: "Latex",
	props: {
		latex: {
			type: String as PropType<string>,
			default: "",
		},
		display: {
			type: Boolean,
			default: false,
		},
	},
	setup(props) {
		const root = ref<HTMLElement | null>(null);

		function update(): void {
			const el = root.value;
			if (!el) return;
			const source = props.latex;
			if (!source.trim()) {
				el.replaceChildren();
				return;
			}
			try {
				el.innerHTML = renderLatexToHtml(source, props.display);
			} catch (err) {
				const message =
					err instanceof Error ? err.message : String(err);
				el.replaceChildren();
				el.textContent = `LaTeX 渲染失败: ${message}`;
			}
		}

		watch(
			() => [props.latex, props.display] as const,
			() => {
				update();
			},
		);

		onMounted(() => {
			update();
		});

		return () =>
			h(props.display ? "div" : "span", {
				ref: root,
				class: [
					"vue-interactive-latex",
					props.display && "vue-interactive-latex--display",
				],
			});
	},
});
