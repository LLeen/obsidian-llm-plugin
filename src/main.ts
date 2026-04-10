import {Notice, Plugin, ItemView} from 'obsidian';
import {DEFAULT_SETTINGS, CanvasNodeCollectorSettings} from "./settings";
import type { SelectedCanvasNodeInfo, CanvasNodeLike} from "./types";
import {buildSelectedNodesTextPacket, collectSelectedCanvasNodes} from "./services/contextService";

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
// eslint-disable-next-line obsidianmd/ui/sentence-case
                new Notice("已发送");
				const packedText = this.buildCurrentContextPacket();
// eslint-disable-next-line obsidianmd/ui/sentence-case
				console.debug("打包后的文本:", packedText);

				//await this.sendTextToApi(packedText);
			}
		});
	}








    saveSelectedCanvasNodes() {
		const view = this.app.workspace.getActiveViewOfType(ItemView);

		if (!view || view.getViewType() !== "canvas") {
// eslint-disable-next-line obsidianmd/ui/sentence-case
			new Notice("当前不是 Canvas 视图");
			return;
		}

		const canvasView = view as CanvasViewLike;
		if (!canvasView.canvas) {
// eslint-disable-next-line obsidianmd/ui/sentence-case
			new Notice("没有拿到 Canvas 对象");
			return;
		}

		const selection = Array.from(canvasView.canvas.selection ?? []);

		if (selection.length === 0) {
// eslint-disable-next-line obsidianmd/ui/sentence-case
			new Notice("当前没有选中任何节点");
			this.selectedCanvasNodes = [];
			return;
		}

		this.selectedCanvasNodes = collectSelectedCanvasNodes(selection);

        // eslint-disable-next-line obsidianmd/ui/sentence-case
		console.debug("Hi,原始选中节点对象:", selection);
       // eslint-disable-next-line obsidianmd/ui/sentence-case
		console.debug("Hi,提取后的节点信息:", this.selectedCanvasNodes);
       // eslint-disable-next-line obsidianmd/ui/sentence-case
		new Notice(`已保存 ${this.selectedCanvasNodes.length} 个节点`);


	}

buildCurrentContextPacket(): string {
	return buildSelectedNodesTextPacket(this.selectedCanvasNodes);
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
