import type { NodeBridgeInbound } from "./bridgeProtocol";
import { NodeProxyHost } from "./proxyHost";

/**
 * One MessageChannel session between the plugin window and a sandbox iframe for Node builtins.
 */
export class NodeBridgeSession {
	private readonly host: NodeProxyHost;
	private readonly port: MessagePort;
	private readonly onMessage: (event: MessageEvent) => void;

	constructor(enableExtended = false) {
		this.host = new NodeProxyHost(enableExtended);
		const channel = new MessageChannel();
		this.port = channel.port1;
		this.onMessage = (event: MessageEvent) => {
			const data = event.data as NodeBridgeInbound;
			if (!data || typeof data !== "object" || !("kind" in data)) {
				return;
			}
			void this.host.handleMessage(data).then((reply) => {
				if (reply) {
					this.port.postMessage(reply);
				}
			});
		};
		this.port.addEventListener("message", this.onMessage);
		this.port.start();
		this.transferPort = channel.port2;
	}

	readonly transferPort: MessagePort;

	setAllowExtended(enableExtended: boolean): void {
		this.host.setAllowExtended(enableExtended);
	}

	dispose(): void {
		this.port.removeEventListener("message", this.onMessage);
		this.port.close();
		this.host.dispose();
	}
}
