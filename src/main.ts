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

		this.addCommand({
			id: "save-selected-canvas-nodes",
			name: "Save selected canvas nodes",
			callback: () => {
				this.saveSelectedCanvasNodes();
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

        for (const node of selection) {
	console.log("node =", node);
	console.log("node.type =", node?.type);
	console.log("node.data?.type =", node?.data?.type);
	console.log("inferred type =", inferCanvasNodeType(node));
}

		new Notice(`已保存 ${this.selectedCanvasNodes.length} 个节点`);
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
