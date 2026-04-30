import type {App} from "obsidian";
import type {
	SelectedCanvasNodeInfo,
	CanvasNodeLike,
	CanvasNodeStoredDataLike,
} from "../canvasTypes";
import type {
	ContextPacket,
	ContextPacketNode,
} from "../contextTypes";
import type {CanvasNodeCollectorSettings} from "../settings";
import {parseCanvasData} from "./canvasFileParser";
import {classifyCanvasFileReference} from "./canvasFileReferenceService";
import {buildContextPacketNode} from "./contextNodeBuilder";
import {compressTextForContext} from "./contextText";
import {renderContextPacketPrompt} from "./promptRenderService";
import {
	buildRelatedContextSection,
	buildRelatedContextSectionWithFileContents,
} from "./relatedContextService";

const MAX_NODE_TEXT_CHARS = 1000;
const MAX_TOTAL_TEXT_CHARS = 4000;
const MAX_RELATED_ITEMS = 5;
const MAX_RELATED_NODE_TEXT_CHARS = 400;

type PacketTextBudgetResult = {
	nodes: ContextPacketNode[];
	truncated: boolean;
	omittedNodeCount: number;
};

type ContextPacketBuildOptions = Pick<
	CanvasNodeCollectorSettings,
	"relatedHopDepth" | "includeRelatedParentNodes" | "includeRelatedChildNodes"
>;

export type RenderedContextPromptResult = {
	packet: ContextPacket;
	prompt: string;
};

export type RenderedContextPromptOptions = ContextPacketBuildOptions & {
	systemPrompt?: string;
	userQuestion: string;
};

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === "object" && value !== null;
}

function readStringOrPath(value: unknown): string | undefined {
	if (typeof value === "string") {
		return value;
	}

	if (isRecord(value) && typeof value.path === "string") {
		return value.path;
	}

	return undefined;
}

function readNodeField<T extends keyof CanvasNodeStoredDataLike>(node: CanvasNodeLike, key: T): CanvasNodeStoredDataLike[T] {
	return node[key] ?? node.data?.[key] ?? node.unknownData?.[key];
}

function isKnownCanvasNodeType(value: unknown): value is "text" | "file" | "group" {
	return value === "text" || value === "file" || value === "group";
}

//type checking
function inferCanvasNodeType(node: CanvasNodeLike): "text" | "file" | "group" | "unknown" {
	const storedType = readNodeField(node, "type");

	if (isKnownCanvasNodeType(storedType)) {
		return storedType;
	}

	if (typeof readNodeField(node, "text") === "string") return "text";
	if (readStringOrPath(readNodeField(node, "file"))) return "file";

	return "unknown";
}

//collect the nodes info
export function collectSelectedCanvasNodes(
	selection: CanvasNodeLike[],
): SelectedCanvasNodeInfo[] {
	return selection.map((node: CanvasNodeLike) => {
		const textValue = readNodeField(node, "text");
		const fileValue = readNodeField(node, "file");
		const labelValue = readNodeField(node, "label");
		const file = readStringOrPath(fileValue);
		const fileClassification = classifyCanvasFileReference(file);
		const type = inferCanvasNodeType(node);

		return {
			id: readNodeField(node, "id") ?? "",
			type,
			x: readNodeField(node, "x"),
			y: readNodeField(node, "y"),
			width: readNodeField(node, "width"),
			height: readNodeField(node, "height"),
			text: typeof textValue === "string" ? textValue : undefined,
			file,
			label: typeof labelValue === "string" ? labelValue : undefined,
			fileKind: type === "file" ? fileClassification.fileKind : undefined,
			fileExtension: type === "file" ? fileClassification.fileExtension : undefined,
			textSource: typeof textValue === "string" ? "canvas-text" : undefined,
		};
	});
}

function buildLegacyTextPacket(nodes: ContextPacketNode[]): string {
	return nodes
		.filter((node) => typeof node.text === "string" && node.text.trim().length > 0)
		.map((node, index) => {
			return `Node ${index + 1}:\n${node.text?.trim()}`;
		})
		.join("\n\n---\n\n");
}

function applyTextBudget(nodes: ContextPacketNode[]): PacketTextBudgetResult {
	let remainingTextChars = MAX_TOTAL_TEXT_CHARS;
	let truncated = false;
	let omittedNodeCount = 0;

	const budgetedNodes = nodes.map((node) => {
		if (typeof node.text !== "string") {
			return node;
		}

		const normalizedText = node.text.trim();
		const perNodeText = compressTextForContext(normalizedText, MAX_NODE_TEXT_CHARS);
		const allowedText = typeof perNodeText === "string"
			? compressTextForContext(perNodeText, remainingTextChars)
			: undefined;

		if (typeof allowedText === "string" && allowedText.length < normalizedText.length) {
			truncated = true;
		}

		if (normalizedText.length > 0 && typeof allowedText !== "string") {
			omittedNodeCount += 1;
		}

		remainingTextChars -= allowedText?.length ?? 0;

		return {
			...node,
			text: allowedText,
		};
	});

	return {
		nodes: budgetedNodes,
		truncated,
		omittedNodeCount,
	};
}

function buildContextPacketFromSections(
	nodes: SelectedCanvasNodeInfo[],
	budgetedResult: PacketTextBudgetResult,
	related: ContextPacket["related"],
): ContextPacket {
	const legacyTextPacket = buildLegacyTextPacket(budgetedResult.nodes);

	return {
		format: "context-packet/v1",
		primary: {
			nodeCount: nodes.length,
			textNodeCount: budgetedResult.nodes.filter((node) => typeof node.text === "string").length,
			fileNodeCount: budgetedResult.nodes.filter((node) => typeof node.file === "string").length,
			truncated: budgetedResult.truncated,
			omittedNodeCount: budgetedResult.omittedNodeCount,
			nodes: budgetedResult.nodes,
		},
		related,
		limits: {
			maxNodeTextChars: MAX_NODE_TEXT_CHARS,
			maxTotalTextChars: MAX_TOTAL_TEXT_CHARS,
			maxRelatedItems: MAX_RELATED_ITEMS,
			maxRelatedNodeTextChars: MAX_RELATED_NODE_TEXT_CHARS,
		},
		legacyTextPacket,
	};
}

export function serializeContextPacket(packet: ContextPacket): string {
	return JSON.stringify(packet, null, 2);
}

export function buildSelectedNodesContextPacket(
	nodes: SelectedCanvasNodeInfo[],
	canvasText?: string,
	options?: ContextPacketBuildOptions,
): ContextPacket {
	const structuredNodes = nodes.map((node, index) => buildContextPacketNode(node, index));
	const budgetedResult = applyTextBudget(structuredNodes);
	const canvasData = parseCanvasData(canvasText);
	const related = buildRelatedContextSection(
		nodes,
		canvasData,
		{
			maxRelatedItems: MAX_RELATED_ITEMS,
			maxRelatedNodeTextChars: MAX_RELATED_NODE_TEXT_CHARS,
			relatedHopDepth: options?.relatedHopDepth,
			includeRelatedParentNodes: options?.includeRelatedParentNodes,
			includeRelatedChildNodes: options?.includeRelatedChildNodes,
		},
	);

	return buildContextPacketFromSections(nodes, budgetedResult, related);
}

export async function buildSelectedNodesContextPacketWithRelatedContent(
	app: App,
	nodes: SelectedCanvasNodeInfo[],
	canvasText?: string,
	options?: ContextPacketBuildOptions,
): Promise<ContextPacket> {
	const structuredNodes = nodes.map((node, index) => buildContextPacketNode(node, index));
	const budgetedResult = applyTextBudget(structuredNodes);
	const canvasData = parseCanvasData(canvasText);
	const related = await buildRelatedContextSectionWithFileContents(
		app,
		nodes,
		canvasData,
		{
			maxRelatedItems: MAX_RELATED_ITEMS,
			maxRelatedNodeTextChars: MAX_RELATED_NODE_TEXT_CHARS,
			relatedHopDepth: options?.relatedHopDepth,
			includeRelatedParentNodes: options?.includeRelatedParentNodes,
			includeRelatedChildNodes: options?.includeRelatedChildNodes,
		},
	);

	return buildContextPacketFromSections(nodes, budgetedResult, related);
}

export async function buildSelectedNodesRenderedPrompt(
	app: App,
	nodes: SelectedCanvasNodeInfo[],
	canvasText: string | undefined,
	options: RenderedContextPromptOptions,
): Promise<RenderedContextPromptResult> {
	const packet = await buildSelectedNodesContextPacketWithRelatedContent(
		app,
		nodes,
		canvasText,
		options,
	);
	const canvasData = parseCanvasData(canvasText);
	const prompt = renderContextPacketPrompt(packet, {
		systemPrompt: options.systemPrompt,
		userQuestion: options.userQuestion,
		canvasData,
	});

	return {
		packet,
		prompt,
	};
}

// Save the selected node info into a serialized v1 ContextPacket.
export function buildSelectedNodesTextPacket(
	nodes: SelectedCanvasNodeInfo[],
	canvasText?: string,
	options?: ContextPacketBuildOptions,
): string {
	const packet = buildSelectedNodesContextPacket(nodes, canvasText, options);

	return serializeContextPacket(packet);
}
