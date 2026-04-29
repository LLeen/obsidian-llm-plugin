import {App} from "obsidian";
import type {SelectedCanvasNodeInfo} from "../canvasTypes";

const SUMMARY_NODE_GAP = 80;
const SELECTED_GROUP_PADDING = 40;
const SELECTED_GROUP_LABEL = "Selected context";
const SUMMARY_NODE_MIN_WIDTH = 320;
const SUMMARY_NODE_MAX_WIDTH = 720;
const SUMMARY_NODE_MIN_HEIGHT = 180;
const SUMMARY_NODE_MAX_HEIGHT = 720;
const SUMMARY_NODE_HORIZONTAL_PADDING = 48;
const SUMMARY_NODE_VERTICAL_PADDING = 64;
const SUMMARY_NODE_AVERAGE_CHAR_WIDTH = 8;
const SUMMARY_NODE_LINE_HEIGHT = 24;
const SUMMARY_NODE_MIN_LINE_CHARS = 32;
const SUMMARY_NODE_MAX_LINE_CHARS = 84;

type AppendLlmSummaryNodeOptions = {
	selectedNodes: SelectedCanvasNodeInfo[];
	resultText: string;
	canvasFilePath: string;
};

type CanvasWriteData = Record<string, unknown> & {
	nodes: unknown[];
	edges?: unknown[];
};

type NodeBounds = {
	x: number;
	y: number;
	width: number;
	height: number;
};

type NodeSize = {
	width: number;
	height: number;
};

type CanvasNodeWriteData = Record<string, unknown> & {
	id: string;
};

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === "object" && value !== null;
}

function clamp(value: number, min: number, max: number): number {
	return Math.min(Math.max(value, min), max);
}

function parseCanvasWriteData(canvasText: string): CanvasWriteData {
	const parsed = JSON.parse(canvasText) as unknown;

	if (!isRecord(parsed) || !Array.isArray(parsed.nodes) || (parsed.edges !== undefined && !Array.isArray(parsed.edges))) {
		throw new Error("Target Canvas file is malformed.");
	}

	return parsed as CanvasWriteData;
}

function getSelectedNodeBounds(nodes: SelectedCanvasNodeInfo[]): NodeBounds | null {
	const positionedNodes = nodes.filter((node) =>
		typeof node.x === "number"
		&& typeof node.y === "number"
		&& typeof node.width === "number"
		&& typeof node.height === "number",
	);

	if (positionedNodes.length === 0) {
		return null;
	}

	const left = Math.min(...positionedNodes.map((node) => node.x ?? 0));
	const top = Math.min(...positionedNodes.map((node) => node.y ?? 0));
	const right = Math.max(...positionedNodes.map((node) => (node.x ?? 0) + (node.width ?? 0)));
	const bottom = Math.max(...positionedNodes.map((node) => (node.y ?? 0) + (node.height ?? 0)));

	return {
		x: left,
		y: top,
		width: right - left,
		height: bottom - top,
	};
}

function buildSummaryNodePosition(selectedNodes: SelectedCanvasNodeInfo[]): Pick<NodeBounds, "x" | "y"> {
	const bounds = getSelectedNodeBounds(selectedNodes);

	if (!bounds) {
		return {x: 0, y: 0};
	}

	return {
		x: bounds.x + bounds.width + SUMMARY_NODE_GAP,
		y: bounds.y,
	};
}

function buildUniqueCanvasElementId(items: unknown[], prefix: string): string {
	const existingIds = new Set(
		items
			.filter(isRecord)
			.map((node) => node.id)
			.filter((id): id is string => typeof id === "string"),
	);
	const baseId = `${prefix}-${Date.now()}`;
	let candidateId = baseId;
	let suffix = 1;

	while (existingIds.has(candidateId)) {
		candidateId = `${baseId}-${suffix}`;
		suffix += 1;
	}

	return candidateId;
}

function buildSelectedGroupNode(
	canvasData: CanvasWriteData,
	selectedNodes: SelectedCanvasNodeInfo[],
): CanvasNodeWriteData | null {
	if (selectedNodes.length <= 1) {
		return null;
	}

	const bounds = getSelectedNodeBounds(selectedNodes);

	if (!bounds) {
		return null;
	}

	return {
		id: buildUniqueCanvasElementId(canvasData.nodes, "llm-selected-group"),
		type: "group",
		label: SELECTED_GROUP_LABEL,
		x: bounds.x - SELECTED_GROUP_PADDING,
		y: bounds.y - SELECTED_GROUP_PADDING,
		width: bounds.width + SELECTED_GROUP_PADDING * 2,
		height: bounds.height + SELECTED_GROUP_PADDING * 2,
	};
}

function getTextLength(text: string): number {
	return Array.from(text).length;
}

function buildSummaryNodeSize(text: string): NodeSize {
	const lines = text.replace(/\r\n?/g, "\n").split("\n");
	const longestLineLength = Math.max(...lines.map(getTextLength), 1);
	const lineChars = clamp(longestLineLength, SUMMARY_NODE_MIN_LINE_CHARS, SUMMARY_NODE_MAX_LINE_CHARS);
	const estimatedWrappedLineCount = lines.reduce((total, line) => {
		return total + Math.max(1, Math.ceil(getTextLength(line) / lineChars));
	}, 0);

	return {
		width: clamp(
			Math.ceil(lineChars * SUMMARY_NODE_AVERAGE_CHAR_WIDTH + SUMMARY_NODE_HORIZONTAL_PADDING),
			SUMMARY_NODE_MIN_WIDTH,
			SUMMARY_NODE_MAX_WIDTH,
		),
		height: clamp(
			Math.ceil(estimatedWrappedLineCount * SUMMARY_NODE_LINE_HEIGHT + SUMMARY_NODE_VERTICAL_PADDING),
			SUMMARY_NODE_MIN_HEIGHT,
			SUMMARY_NODE_MAX_HEIGHT,
		),
	};
}

function buildSummaryTextNode(
	canvasData: CanvasWriteData,
	options: AppendLlmSummaryNodeOptions,
): CanvasNodeWriteData {
	const position = buildSummaryNodePosition(options.selectedNodes);
	const size = buildSummaryNodeSize(options.resultText);

	return {
		id: buildUniqueCanvasElementId(canvasData.nodes, "llm-summary"),
		type: "text",
		text: options.resultText,
		x: position.x,
		y: position.y,
		width: size.width,
		height: size.height,
	};
}

function buildSourceToSummaryEdge(
	canvasData: CanvasWriteData,
	sourceNodeId: string,
	summaryNode: CanvasNodeWriteData,
): Record<string, unknown> {
	return {
		id: buildUniqueCanvasElementId([...(canvasData.edges ?? []), ...canvasData.nodes], "llm-summary-edge"),
		fromNode: sourceNodeId,
		fromSide: "right",
		toNode: summaryNode.id,
		toSide: "left",
	};
}

function buildSingleSelectedNodeToSummaryEdge(
	canvasData: CanvasWriteData,
	selectedNodes: SelectedCanvasNodeInfo[],
	summaryNode: CanvasNodeWriteData,
): Record<string, unknown> | null {
	if (selectedNodes.length !== 1) {
		return null;
	}

	const selectedNodeId = selectedNodes[0]?.id.trim();

	if (!selectedNodeId) {
		console.debug("Skipped single selected node summary edge because selected node id is missing.");
		return null;
	}

	return buildSourceToSummaryEdge(canvasData, selectedNodeId, summaryNode);
}

export async function appendLlmSummaryNodeToActiveCanvas(
	app: App,
	options: AppendLlmSummaryNodeOptions,
): Promise<void> {
	const canvasFile = app.vault.getFileByPath(options.canvasFilePath);

	if (canvasFile?.extension !== "canvas") {
		throw new Error("The selected Canvas file is not available.");
	}

	const canvasText = await app.vault.read(canvasFile);
	const canvasData = parseCanvasWriteData(canvasText);
	const groupNode = buildSelectedGroupNode(canvasData, options.selectedNodes);
	const summaryNode = buildSummaryTextNode(canvasData, options);

	if (groupNode) {
		canvasData.nodes.push(groupNode);
		canvasData.edges = canvasData.edges ?? [];
		canvasData.edges.push(buildSourceToSummaryEdge(canvasData, groupNode.id, summaryNode));
	} else {
		const directEdge = buildSingleSelectedNodeToSummaryEdge(canvasData, options.selectedNodes, summaryNode);

		if (directEdge) {
			canvasData.edges = canvasData.edges ?? [];
			canvasData.edges.push(directEdge);
		}
	}

	canvasData.nodes.push(summaryNode);

	await app.vault.modify(canvasFile, JSON.stringify(canvasData, null, 2));
}
