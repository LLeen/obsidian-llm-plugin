import {Notice, Plugin} from "obsidian";
import {DEFAULT_SETTINGS, CanvasNodeCollectorSettings, CanvasNodeCollectorSettingTab} from "./settings";
import type {SelectedCanvasNodeInfo} from "./canvasTypes";
import {getActiveCanvasSelection, readCanvasFileTextByPath} from "./services/canvasService";
import {appendLlmSummaryNodeToActiveCanvas} from "./services/canvasResultService";
import {
	buildSelectedNodesContextPacket,
	buildSelectedNodesTextPacket,
	collectSelectedCanvasNodes,
} from "./services/contextService";
import {
	MarkdownFileContentSummary,
	readSelectedMarkdownFileContents,
} from "./services/canvasFileReferenceService";
import {generateAnswer} from "./services/llm/service";

export default class CanvasNodeCollectorPlugin extends Plugin {
	selectedCanvasNodes: SelectedCanvasNodeInfo[] = [];
	selectedCanvasFilePath?: string;
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
				const requestNotice = new Notice("Sending request...", 0);

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
				} finally {
					requestNotice.hide();
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

				await this.loadSelectedMarkdownFileContents();

				const hasReadableContent = this.selectedCanvasNodes.some((node) =>
					(node.text?.trim().length ?? 0) > 0,
				);

				if (!hasReadableContent) {
					new Notice("Selected Canvas nodes have no readable text or Markdown file content.");
					return;
				}

				const packedText = await this.buildCurrentContextPacket();
				const requestNotice = new Notice("Sending request...", 0);

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

					try {
						await appendLlmSummaryNodeToActiveCanvas(this.app, {
							selectedNodes: this.selectedCanvasNodes,
							resultText: result.text,
							canvasFilePath: this.selectedCanvasFilePath ?? "",
						});
						new Notice("Sent successfully. Added summary node to Canvas.");
					} catch (error) {
						const message = error instanceof Error ? error.message : "Unknown error";
						console.error("Failed to add LLM result to Canvas:", message);
						new Notice(`Sent successfully, but failed to add result to Canvas: ${message}`);
					}
				} catch (error) {
					const message = error instanceof Error ? error.message : "Unknown error";
					console.error("Zhipu API call failed:", message);
					new Notice(`Zhipu API call failed: ${message}`);
				} finally {
					requestNotice.hide();
				}
			},
		});

		this.addCommand({
			id: "check-selected-canvas-file-content",
			name: "Check selected Canvas file content",
			callback: async () => {
				if (!this.saveSelectedCanvasNodes()) {
					return;
				}

				const summary = await this.loadSelectedMarkdownFileContents();
				const missingOrErrorCount = summary.missingCount + summary.errorCount;

				console.debug("Selected Canvas file content check:", {
					summary,
					nodes: this.selectedCanvasNodes,
				});

				new Notice(
					`Markdown read: ${summary.readCount}; unsupported files: ${summary.unsupportedCount}; missing/error: ${missingOrErrorCount}.`,
				);
			},
		});
	}

	saveSelectedCanvasNodes(): boolean {
		const selectionResult = getActiveCanvasSelection(this.app);

		if (selectionResult.status === "not-canvas") {
			// eslint-disable-next-line obsidianmd/ui/sentence-case
			this.selectedCanvasNodes = [];
			this.selectedCanvasFilePath = undefined;
			new Notice("The active view is not a Canvas.");
			return false;
		}

		if (selectionResult.status === "missing-canvas") {
			// eslint-disable-next-line obsidianmd/ui/sentence-case
			this.selectedCanvasNodes = [];
			this.selectedCanvasFilePath = undefined;
			new Notice("Could not access the Canvas object.");
			return false;
		}

		const selection = selectionResult.selection;

		if (selection.length === 0) {
			// eslint-disable-next-line obsidianmd/ui/sentence-case
			new Notice("No Canvas nodes are currently selected.");
			this.selectedCanvasNodes = [];
			this.selectedCanvasFilePath = selectionResult.canvasFilePath;
			return false;
		}

		this.selectedCanvasNodes = collectSelectedCanvasNodes(selection);
		this.selectedCanvasFilePath = selectionResult.canvasFilePath;

		// eslint-disable-next-line obsidianmd/ui/sentence-case
		console.debug("Raw selected Canvas nodes:", selection);
		// eslint-disable-next-line obsidianmd/ui/sentence-case
		console.debug("Extracted Canvas node info:", this.selectedCanvasNodes);
		console.debug("Selected Canvas file path:", this.selectedCanvasFilePath);
		// eslint-disable-next-line obsidianmd/ui/sentence-case
		new Notice(`Saved ${this.selectedCanvasNodes.length} selected node(s).`);

		return true;
	}

	async loadSelectedMarkdownFileContents(): Promise<MarkdownFileContentSummary> {
		const result = await readSelectedMarkdownFileContents(this.app, this.selectedCanvasNodes);

		this.selectedCanvasNodes = result.nodes;
		console.debug("Canvas file reference content results:", {
			summary: result.summary,
			nodes: this.selectedCanvasNodes,
		});

		return result.summary;
	}

	async buildCurrentContextPacket(): Promise<string> {
		let canvasText: string | undefined;

		try {
			canvasText = await readCanvasFileTextByPath(this.app, this.selectedCanvasFilePath);
		} catch (error) {
			console.debug("Failed to read selected canvas file for related context:", error);
		}

		const packet = buildSelectedNodesContextPacket(this.selectedCanvasNodes, canvasText);
		console.debug("primaryContext:", {
			nodeCount: packet.primary.nodeCount,
			textNodeCount: packet.primary.textNodeCount,
			fileNodeCount: packet.primary.fileNodeCount,
			nodes: packet.primary.nodes,
			fileReferences: packet.primary.nodes.map((node) => ({
				id: node.id,
				file: node.file,
				fileKind: node.fileKind,
				fileExtension: node.fileExtension,
				textSource: node.textSource,
				fileContentStatus: node.fileContentStatus,
			})),
			truncated: packet.primary.truncated,
			omittedNodeCount: packet.primary.omittedNodeCount,
			limits: packet.limits,
		});
		console.debug("relatedContext:", packet.related);
		console.debug("relatedCompressedContexts:", packet.related?.items.map((item) => ({
			id: item.node.id,
			score: item.score,
			connectionCount: item.connectionCount,
			viaSelectedNodeIds: item.viaSelectedNodeIds,
			text: item.node.text,
			file: item.node.file,
			fileKind: item.node.fileKind,
			fileExtension: item.node.fileExtension,
		})) ?? []);
		console.debug("legacyTextPacket:", packet.legacyTextPacket);
		return buildSelectedNodesTextPacket(this.selectedCanvasNodes, canvasText);
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
