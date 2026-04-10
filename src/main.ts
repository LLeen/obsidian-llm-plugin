import {Notice, Plugin, ItemView} from 'obsidian';
import {DEFAULT_SETTINGS, CanvasNodeCollectorSettings, CanvasNodeCollectorSettingTab} from "./settings";
import type { SelectedCanvasNodeInfo, CanvasNodeLike} from "./types";
import {buildSelectedNodesTextPacket, collectSelectedCanvasNodes} from "./services/contextService";
import {generateAnswer} from "./services/llm/service";
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
        this.addSettingTab(new CanvasNodeCollectorSettingTab(this.app, this));
       //This adds a command for saving the info of selected nodes.
		this.addCommand({
			id: "save-selected-canvas-nodes",
			name: "Save selected canvas nodes",
			callback: () => {
				this.saveSelectedCanvasNodes();
			}
		});


        this.addCommand({
			id: "test-zhipu-api",
			name: "Test Zhipu API",
			callback: async () => {
				try {
					const result = await generateAnswer({
						apiKey: this.settings.apiKey,
						baseUrl: this.settings.baseUrl,
						model: this.settings.model,
						temperature: this.settings.temperature,
						maxTokens: this.settings.maxTokens,
						contextText:"重复这句话",
						userInput: "Summarize the core idea in Chinese.",
					});

					console.debug("LLM response text:", result.text);
					new Notice("Zhipu API call succeeded. Check console output.");
				} catch (error) {
					const message = error instanceof Error ? error.message : "Unknown error";
					console.error("Zhipu API call failed:", message);
					new Notice(`Zhipu API call failed: ${message}`);
                    console.debug("Current model:", this.settings.model);
				}
			},
		});

        this.addCommand({
	id: "send-selected-canvas-text",
	name: "Send selected canvas text",
	callback: async () => {

        this.saveSelectedCanvasNodes();
		if (this.selectedCanvasNodes.length === 0) {
			new Notice("没有可发送的节点");
			return;
		}

		const packedText = this.buildCurrentContextPacket();

		try {
			const result = await generateAnswer({
				apiKey: this.settings.apiKey,
				baseUrl: this.settings.baseUrl,
				model: this.settings.model,
				temperature: this.settings.temperature,
				maxTokens: this.settings.maxTokens,
				contextText: packedText,
				userInput: "请根据这些节点内容进行总结。"
			});

			console.debug("LLM response text:", result.text);
            console.debug(result.raw);
			new Notice("发送成功，请查看控制台输出");
		} catch (error) {
			const message = error instanceof Error ? error.message : "Unknown error";
			console.error("Zhipu API call failed:", message);
			new Notice(`Zhipu API call failed: ${message}`);

		}
	},
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
