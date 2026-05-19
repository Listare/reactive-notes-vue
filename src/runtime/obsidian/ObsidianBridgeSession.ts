import type { App } from "obsidian";
import type { ObsidianBridgeInbound } from "./bridgeProtocol";
import { ObsidianProxyHost } from "./proxyHost";

/**
 * One MessageChannel session between the plugin window and a sandbox iframe.
 */
export class ObsidianBridgeSession {
	private readonly host: ObsidianProxyHost;
	private readonly port: MessagePort;
	private readonly onMessage: (event: MessageEvent) => void;

	constructor(app: App) {
		this.host = new ObsidianProxyHost(app);
		const channel = new MessageChannel();
		this.port = channel.port1;
		this.onMessage = (event: MessageEvent) => {
			const data = event.data as ObsidianBridgeInbound;
			if (!data || typeof data !== "object" || !("kind" in data)) {
				return;
			}
			const reply = this.host.handleMessage(data);
			if (reply) {
				this.port.postMessage(reply);
			}
		};
		this.port.addEventListener("message", this.onMessage);
		this.port.start();
		this.transferPort = channel.port2;
	}

	readonly transferPort: MessagePort;

	dispose(): void {
		this.port.removeEventListener("message", this.onMessage);
		this.port.close();
		this.host.dispose();
	}
}
