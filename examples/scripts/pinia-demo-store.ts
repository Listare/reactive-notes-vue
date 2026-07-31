import { defineStore } from "pinia";

/**
 * Store defined under @custom-script/; persist path is relative to this file
 * → scripts/pinia-script-counter.json
 */
export const useScriptCounter = defineStore("pinia-script-counter", {
	state: () => ({ count: 0 }),
	actions: {
		inc() {
			this.count += 1;
		},
	},
	persist: "./pinia-script-counter.json",
});
