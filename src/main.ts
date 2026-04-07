import {App, Editor, MarkdownView, Modal, Notice, Plugin, ItemView} from 'obsidian';
import {DEFAULT_SETTINGS, MyPluginSettings, SampleSettingTab} from "./settings";

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

function inferCanvasNodeType(node: any): "text" | "file" | "link" | "group" | "unknown" {
	if (typeof node?.type === "string") return node.type;
	if (typeof node?.data?.type === "string") return node.data.type;

	if (typeof node?.text === "string") return "text";
	if (typeof node?.file === "string") return "file";

	return "unknown";
}

export default class MyPlugin extends Plugin {
	selectedCanvasNodes: SelectedCanvasNodeInfo[] = [];

	async onload() {
		await this.loadSettings();

		// This creates an icon in the left ribbon.

		this.addRibbonIcon('dice', 'Sample', (evt: MouseEvent) => {
			// Called when the user clicks the icon.
			new Notice('This is a notice!');
		});

		// This adds a status bar item to the bottom of the app. Does not work on mobile apps.
		const statusBarItemEl = this.addStatusBarItem();
		statusBarItemEl.setText('Status bar text');


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
				console.log("打包后的文本:", packedText);

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

		const canvas = (view as any).canvas;
		if (!canvas) {
			new Notice("没有拿到 canvas 对象");
			return;
		}

		const selection = Array.from(canvas.selection ?? []);

		if (selection.length === 0) {
			new Notice("当前没有选中任何节点");
			this.selectedCanvasNodes = [];
			return;
		}

		this.selectedCanvasNodes = selection.map((node: any) => {
           return {
		id: node.id ?? node.data?.id,
		type: inferCanvasNodeType(node),
		x: node.x ?? node.data?.x,
		y: node.y ?? node.data?.y,
		width: node.width ?? node.data?.width,
		height: node.height ?? node.data?.height,
		text: node.text ?? node.data?.text,
		file: node.file ?? node.data?.file
	};
		});

		console.log("原始选中节点对象:", selection);
		console.log("提取后的节点信息:", this.selectedCanvasNodes);
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
		this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData() as Partial<MyPluginSettings>);
	}

	async saveSettings() {
		await this.saveData(this.settings);
	}
}

class SampleModal extends Modal {
	constructor(app: App) {
		super(app);
	}

	onOpen() {
		let {contentEl} = this;
		contentEl.setText('Woah!');
	}

	onClose() {
		const {contentEl} = this;
		contentEl.empty();
	}
}
