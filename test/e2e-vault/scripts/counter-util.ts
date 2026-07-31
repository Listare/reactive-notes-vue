import { ref, type Ref } from "vue";

export default function useCounter(initial = 0): { count: Ref<number> } {
	const count = ref(initial);
	return { count };
}
