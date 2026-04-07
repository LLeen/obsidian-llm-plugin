import {Notice, Plugin, ItemView} from 'obsidian';
import {DEFAULT_SETTINGS, CanvasNodeCollectorSettings} from "./settings";

// Remember to rename these classes and interfaces!
type SelectedCanvasNodeInfo = {
id: string;
type: "text" | "file" | "unknown";
x?: number;
y?: number;
width?: number;
height?: number;
text?: string;
file?: string;
};

type CanvasNodeLike = {
id?: string;
type?: unknown;
x?: number;
y?: number;
width?: number;
height?: number;
text?: unknown;
file?: unknown;
data?: {
id?: string;
type?: unknown;
x?: number;
y?: number;
width?: number;
height?: number;
text?: unknown;
file?: unknown;
};
};

function inferCanvasNodeType(node: CanvasNodeLike): "text" | "file" | "unknown" {
	if (typeof node.type === "string") {
		if (node.type === "text" || node.type === "file") return node.type;
	}

	if (typeof node.data?.type === "string") {
		if (node.data.type === "text" || node.data.type === "file") return node.data.type;
	}

	if (typeof node.text === "string") return "text";
	if (typeof node.file === "string") return "file";

	return "unknown";
}
//avoid using any for view.
interface CanvasViewLike extends ItemView {
    canvas: {
        selection: Set<CanvasNodeLike>;
    };
}

export default class CanvasNodeCollectorPlugin extends Plugin {
	selectedCanvasNodes: SelectedCanvasNodeInfo[] = [];
    settings: CanvasNodeCollectorSettings;

	async onload() {
		await this.loadSettings();
       //This adds a command for saving the info of selected nodes.
		this.addCommand({
			id: "save-selected-canvas-nodes",
			name: "Save selected canvas nodes",
			callback: () => {
				this.saveSelectedCanvasNodes();
			}
		});

// This adds a command for send the saved info to xxx.
this.addCommand({
			id: "send-selected-canvas-text",
			name: "Send selected canvas text",
			callback: async () => {

				if (this.selectedCanvasNodes.length === 0) {
					new Notice("没有可发送的节点");
					return;
				}
                new Notice("已发送");
				const packedText = this.buildSelectedNodesTextPacket();
				console.debug("打包后的文本:", packedText);

				//await this.sendTextToApi(packedText);
			}
		});
	}

    saveSelectedCanvasNodes() {
		const view = this.app.workspace.getActiveViewOfType(ItemView);

		if (!view || view.getViewType() !== "canvas") {
			new Notice("当前不是 Canvas 视图");
			return;
		}

		const canvasView = view as CanvasViewLike;
		if (!canvasView.canvas) {
			new Notice("没有拿到 canvas 对象");
			return;
		}

		const selection = Array.from(canvasView.canvas.selection ?? []);

		if (selection.length === 0) {
			new Notice("当前没有选中任何节点");
			this.selectedCanvasNodes = [];
			return;
		}

		this.selectedCanvasNodes = selection.map((node) => {
    const textValue = node.text ?? node.data?.text;
    const fileValue = node.file ?? node.data?.file;

    return {
        id: node.id ?? node.data?.id ?? "",
        type: inferCanvasNodeType(node),
        x: node.x ?? node.data?.x,
        y: node.y ?? node.data?.y,
        width: node.width ?? node.data?.width,
        height: node.height ?? node.data?.height,
        text: typeof textValue === "string" ? textValue : undefined,
        file: typeof fileValue === "string" ? fileValue : undefined,
    };
});

		console.debug("原始选中节点对象:", selection);
		console.debug("提取后的节点信息:", this.selectedCanvasNodes);
		new Notice(`已保存 ${this.selectedCanvasNodes.length} 个节点`);

	}

   buildSelectedNodesTextPacket(): string {
		const textParts = this.selectedCanvasNodes
			.filter((node) => typeof node.text === "string" && node.text.trim().length > 0)
			.map((node, index) => {
				return `Node ${index + 1}:\n${node.text}`;
			});

		const result = textParts.join("\n\n---\n\n");
        return result;
	}


	onunload() {
	}

	async loadSettings() {
		this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData() as Partial<CanvasNodeCollectorSettings>);
	}

	async saveSettings() {
		await this.saveData(this.settings);
	}
}
