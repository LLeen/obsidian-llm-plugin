import {Notice, Plugin} from "obsidian";
import {DEFAULT_SETTINGS, CanvasNodeCollectorSettings, CanvasNodeCollectorSettingTab} from "./settings";
import type {SelectedCanvasNodeInfo} from "./canvasTypes";
import {getActiveCanvasSelection, readCanvasFileTextByPath} from "./services/canvasService";
import {parseCanvasData} from "./services/canvasFileParser";
import {collectReadableNodesInsideSelectedGroups} from "./services/canvasGroupContextService";
import {appendLlmSummaryNodeToActiveCanvas} from "./services/canvasResultService";
import {
	buildSelectedNodesRenderedPrompt,
	collectSelectedCanvasNodes,
	serializeContextPacket,
} from "./services/contextService";
import {
	CanvasFileContentSummary,
	readCanvasFileNodeContents,
	readSelectedCanvasFileContents,
} from "./services/canvasFileReferenceService";
import {generateAnswer} from "./services/llm/service";

const DEFAULT_CANVAS_SUMMARY_QUESTION = "Please summarize the selected Canvas nodes in Chinese.";

export default class CanvasNodeCollectorPlugin extends Plugin {
	selectedCanvasNodes: SelectedCanvasNodeInfo[] = [];
	selectedCanvasFilePath?: string;
	currentUserQuestion = "";
	settings: CanvasNodeCollectorSettings;

	async onload() {
		await this.loadSettings();
		this.addSettingTab(new CanvasNodeCollectorSettingTab(this.app, this));
		this.addQuestionStatusBar();

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
						systemPrompt: this.settings.systemPrompt,
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
				await this.sendSelectedCanvasText();
			},
		});

		this.addCommand({
			id: "check-selected-canvas-file-content",
			name: "Check selected Canvas file content",
			callback: async () => {
				if (!this.saveSelectedCanvasNodes()) {
					return;
				}

				const summary = await this.loadSelectedCanvasFileContents();
				const missingOrErrorCount = summary.missingCount + summary.errorCount;

				console.debug("Selected Canvas file content check:", {
					summary,
					nodes: this.selectedCanvasNodes,
				});

				new Notice(
					`File content read: ${summary.readCount}; unsupported files: ${summary.unsupportedCount}; not file nodes: ${summary.notFileCount}; missing/error: ${missingOrErrorCount}.`,
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

	addQuestionStatusBar(): void {
		const statusBarItem = this.addStatusBarItem();

		statusBarItem.addClass("ai99-question-bar");
		const inputEl = statusBarItem.createEl("input");

		inputEl.type = "text";
		inputEl.addClass("ai99-question-input");
		inputEl.placeholder = DEFAULT_CANVAS_SUMMARY_QUESTION;
		inputEl.setAttribute("aria-label", "AI question for selected Canvas nodes");
		inputEl.addEventListener("input", () => {
			this.currentUserQuestion = inputEl.value;
		});
		inputEl.addEventListener("keydown", (event) => {
			if (event.key !== "Enter") {
				return;
			}

			event.preventDefault();
			void this.sendSelectedCanvasText();
		});
	}

	getCurrentUserQuestion(): string {
		const question = this.currentUserQuestion.trim();

		return question.length > 0 ? question : DEFAULT_CANVAS_SUMMARY_QUESTION;
	}

	async sendSelectedCanvasText(): Promise<void> {
		if (!this.saveSelectedCanvasNodes()) {
			return;
		}

		if (this.selectedCanvasNodes.length === 0) {
			new Notice("No selected nodes to send.");
			return;
		}

		const userQuestion = this.getCurrentUserQuestion();
		const resultSourceNodes = this.selectedCanvasNodes;
		const fileContentSummary = await this.loadSelectedCanvasFileContents();
		let groupContentSummary: CanvasFileContentSummary | undefined;

		try {
			groupContentSummary = await this.loadSelectedCanvasGroupContents();
		} catch (error) {
			console.debug("Failed to load selected Canvas group contents:", error);
		}

		const hasReadableContent = this.selectedCanvasNodes.some((node) =>
			(node.text?.trim().length ?? 0) > 0,
		);

		if (!hasReadableContent) {
			const missingOrErrorCount = fileContentSummary.missingCount
				+ fileContentSummary.errorCount
				+ (groupContentSummary?.missingCount ?? 0)
				+ (groupContentSummary?.errorCount ?? 0);
			const unsupportedCount = fileContentSummary.unsupportedCount + (groupContentSummary?.unsupportedCount ?? 0);
			const notFileCount = fileContentSummary.notFileCount + (groupContentSummary?.notFileCount ?? 0);

			new Notice(
				`Selected Canvas nodes have no readable text, Markdown, or PDF content. Unsupported: ${unsupportedCount}; not file nodes: ${notFileCount}; missing/error: ${missingOrErrorCount}.`,
			);
			return;
		}

		const renderedPrompt = await this.buildCurrentContextPacket(userQuestion);
		const requestNotice = new Notice("Sending request...", 0);

		try {
			const result = await generateAnswer({
				apiKey: this.settings.apiKey,
				baseUrl: this.settings.baseUrl,
				model: this.settings.model,
				temperature: this.settings.temperature,
				maxTokens: this.settings.maxTokens,
				contextText: renderedPrompt,
				userInput: userQuestion,
				systemPrompt: this.settings.systemPrompt,
			});

			console.debug("LLM response text:", result.text);
			console.debug(result.raw);

			try {
				await appendLlmSummaryNodeToActiveCanvas(this.app, {
					selectedNodes: resultSourceNodes,
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
	}

	async loadSelectedCanvasFileContents(): Promise<CanvasFileContentSummary> {
		const result = await readSelectedCanvasFileContents(this.app, this.selectedCanvasNodes);

		this.selectedCanvasNodes = result.nodes;
		console.debug("Canvas file reference content results:", {
			summary: result.summary,
			nodes: this.selectedCanvasNodes,
		});

		return result.summary;
	}

	async loadSelectedCanvasGroupContents(): Promise<CanvasFileContentSummary> {
		let canvasText: string | undefined;

		try {
			canvasText = await readCanvasFileTextByPath(this.app, this.selectedCanvasFilePath);
		} catch (error) {
			console.debug("Failed to read selected canvas file for group context:", error);
		}

		const groupContextNodes = collectReadableNodesInsideSelectedGroups(
			this.selectedCanvasNodes,
			parseCanvasData(canvasText),
		);
		const groupFileNodes = groupContextNodes.filter((node) => node.type === "file");
		const groupFileContentResult = await readCanvasFileNodeContents(this.app, groupFileNodes);
		const groupFileNodeById = new Map(groupFileContentResult.nodes.map((node) => [node.id, node]));
		const enrichedGroupContextNodes = groupContextNodes.map((node) => groupFileNodeById.get(node.id) ?? node);

		this.selectedCanvasNodes = [
			...this.selectedCanvasNodes,
			...enrichedGroupContextNodes,
		];

		console.debug("groupContextNodesArray:", enrichedGroupContextNodes.map((node) => ({
			id: node.id,
			type: node.type,
			text: node.text,
			file: node.file,
			fileKind: node.fileKind,
			fileExtension: node.fileExtension,
			textSource: node.textSource,
			fileContentStatus: node.fileContentStatus,
			sourceGroupId: node.sourceGroupId,
			sourceGroupLabel: node.sourceGroupLabel,
			sourceGroupPath: node.sourceGroupPath,
		})));

		return groupFileContentResult.summary;
	}

	async buildCurrentContextPacket(userQuestion: string = this.getCurrentUserQuestion()): Promise<string> {
		let canvasText: string | undefined;

		try {
			canvasText = await readCanvasFileTextByPath(this.app, this.selectedCanvasFilePath);
		} catch (error) {
			console.debug("Failed to read selected canvas file for related context:", error);
		}

		const {packet, prompt} = await buildSelectedNodesRenderedPrompt(
			this.app,
			this.selectedCanvasNodes,
			canvasText,
			{
				...this.settings,
				systemPrompt: this.settings.systemPrompt,
				userQuestion,
			},
		);
		const relatedNodesArray = packet.related?.items.map((item) => ({
			id: item.node.id,
			type: item.node.type,
			score: item.score,
			minHop: item.minHop,
			directions: item.directions,
			connectionCount: item.connectionCount,
			viaSelectedNodeIds: item.viaSelectedNodeIds,
			text: item.node.text,
			file: item.node.file,
			fileKind: item.node.fileKind,
			fileExtension: item.node.fileExtension,
			textSource: item.node.textSource,
			fileContentStatus: item.node.fileContentStatus,
			groupNodes: item.groupNodes?.map((node) => ({
				id: node.id,
				type: node.type,
				text: node.text,
				file: node.file,
				fileKind: node.fileKind,
				fileExtension: node.fileExtension,
				textSource: node.textSource,
				fileContentStatus: node.fileContentStatus,
				sourceGroupId: node.sourceGroupId,
				sourceGroupLabel: node.sourceGroupLabel,
				sourceGroupPath: node.sourceGroupPath,
			})),
		})) ?? [];

		console.debug("relatedNodesArray:", relatedNodesArray);
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
				sourceGroupId: node.sourceGroupId,
				sourceGroupLabel: node.sourceGroupLabel,
				sourceGroupPath: node.sourceGroupPath,
			})),
			truncated: packet.primary.truncated,
			omittedNodeCount: packet.primary.omittedNodeCount,
			limits: packet.limits,
		});
		console.debug("relatedContext:", packet.related);
		console.debug("relatedCompressedContexts:", packet.related?.items.map((item) => ({
			id: item.node.id,
			score: item.score,
			minHop: item.minHop,
			directions: item.directions,
			connectionCount: item.connectionCount,
			viaSelectedNodeIds: item.viaSelectedNodeIds,
			text: item.node.text,
			file: item.node.file,
			fileKind: item.node.fileKind,
			fileExtension: item.node.fileExtension,
			groupNodes: item.groupNodes?.map((node) => ({
				id: node.id,
				type: node.type,
				textSource: node.textSource,
				fileContentStatus: node.fileContentStatus,
				sourceGroupId: node.sourceGroupId,
				sourceGroupLabel: node.sourceGroupLabel,
				sourceGroupPath: node.sourceGroupPath,
			})),
		})) ?? []);
		console.debug("legacyTextPacket:", packet.legacyTextPacket);
		console.debug("serializedContextPacket:", serializeContextPacket(packet));
		console.debug("renderedPrompt:", prompt);
		return prompt;
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
