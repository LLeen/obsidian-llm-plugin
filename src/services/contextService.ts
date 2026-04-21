import type {
	SelectedCanvasNodeInfo,
	CanvasNodeLike,
} from "../canvasTypes";
import type {
	ContextPacket,
	ContextPacketNode,
} from "../contextTypes";
import {parseCanvasData} from "./canvasFileParser";
import {buildContextPacketNode} from "./contextNodeBuilder";
import {compressTextForContext} from "./contextText";
import {buildRelatedContextSection} from "./relatedContextService";

const MAX_NODE_TEXT_CHARS = 1000;
const MAX_TOTAL_TEXT_CHARS = 4000;
const MAX_RELATED_ITEMS = 5;
const MAX_RELATED_NODE_TEXT_CHARS = 400;

type PacketTextBudgetResult = {
	nodes: ContextPacketNode[];
	truncated: boolean;
	omittedNodeCount: number;
};

//type checking
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

//collect the nodes info
export function collectSelectedCanvasNodes(
	selection: CanvasNodeLike[],
): SelectedCanvasNodeInfo[] {
	return selection.map((node: CanvasNodeLike) => {
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

export function buildSelectedNodesContextPacket(
	nodes: SelectedCanvasNodeInfo[],
	canvasText?: string,
): ContextPacket {
	const structuredNodes = nodes.map((node, index) => buildContextPacketNode(node, index));
	const budgetedResult = applyTextBudget(structuredNodes);
	const related = buildRelatedContextSection(
		nodes,
		parseCanvasData(canvasText),
		{
			maxRelatedItems: MAX_RELATED_ITEMS,
			maxRelatedNodeTextChars: MAX_RELATED_NODE_TEXT_CHARS,
		},
	);
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

// Save the selected node info into a serialized v1 ContextPacket.
export function buildSelectedNodesTextPacket(nodes: SelectedCanvasNodeInfo[], canvasText?: string): string {
	const packet = buildSelectedNodesContextPacket(nodes, canvasText);

	return JSON.stringify(packet, null, 2);
}
