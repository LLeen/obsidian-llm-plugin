import {Notice, Plugin, ItemView} from "obsidian";
import {DEFAULT_SETTINGS, CanvasNodeCollectorSettings, CanvasNodeCollectorSettingTab} from "./settings";
import type {SelectedCanvasNodeInfo, CanvasNodeLike} from "./types";
import {buildSelectedNodesTextPacket, collectSelectedCanvasNodes} from "./services/contextService";
import {generateAnswer} from "./services/llm/service";

// avoid using any for view.
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

		// This adds a command for saving the info of selected nodes.
		this.addCommand({
			id: "save-selected-canvas-nodes",
			name: "Save selected canvas nodes",
			callback: () => {
				this.saveSelectedCanvasNodes();
			},
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
						contextText: "Repeat this sentence.",
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
				if (!this.saveSelectedCanvasNodes()) {
					return;
				}

				if (this.selectedCanvasNodes.length === 0) {
					new Notice("No selected nodes to send.");
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
						userInput: "Please summarize the selected Canvas nodes in Chinese.",
					});

					console.debug("LLM response text:", result.text);
					console.debug(result.raw);
					new Notice("Sent successfully. Check the console output.");
				} catch (error) {
					const message = error instanceof Error ? error.message : "Unknown error";
					console.error("Zhipu API call failed:", message);
					new Notice(`Zhipu API call failed: ${message}`);
				}
			},
		});
	}

	saveSelectedCanvasNodes(): boolean {
		const view = this.app.workspace.getActiveViewOfType(ItemView);

		if (!view || view.getViewType() !== "canvas") {
			// eslint-disable-next-line obsidianmd/ui/sentence-case
			this.selectedCanvasNodes = [];
			new Notice("The active view is not a Canvas.");
			return false;
		}

		const canvasView = view as CanvasViewLike;
		if (!canvasView.canvas) {
			// eslint-disable-next-line obsidianmd/ui/sentence-case
			this.selectedCanvasNodes = [];
			new Notice("Could not access the Canvas object.");
			return false;
		}

		const selection = Array.from(canvasView.canvas.selection ?? []);

		if (selection.length === 0) {
			// eslint-disable-next-line obsidianmd/ui/sentence-case
			new Notice("No Canvas nodes are currently selected.");
			this.selectedCanvasNodes = [];
			return false;
		}

		this.selectedCanvasNodes = collectSelectedCanvasNodes(selection);

		// eslint-disable-next-line obsidianmd/ui/sentence-case
		console.debug("Raw selected Canvas nodes:", selection);
		// eslint-disable-next-line obsidianmd/ui/sentence-case
		console.debug("Extracted Canvas node info:", this.selectedCanvasNodes);
		// eslint-disable-next-line obsidianmd/ui/sentence-case
		new Notice(`Saved ${this.selectedCanvasNodes.length} selected node(s).`);

		return true;
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
