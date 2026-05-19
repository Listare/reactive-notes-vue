export class CustomScriptPathError extends Error {
	constructor(message: string) {
		super(message);
		this.name = "CustomScriptPathError";
	}
}
