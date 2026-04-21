import type {
	SelectedCanvasNodeInfo,
	CanvasNodeLike,
	CanvasFileData,
	CanvasFileEdgeData,
	CanvasFileNodeData,
	ContextPacket,
	ContextPacketNode,
	RelatedContextItem,
	RelatedContextSection,
} from "../types";

const MAX_NODE_TEXT_CHARS = 1000;
const MAX_TOTAL_TEXT_CHARS = 4000;
const MAX_RELATED_ITEMS = 5;
const MAX_RELATED_NODE_TEXT_CHARS = 400;
const EXCERPT_SEPARATOR = "\n...\n";

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

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === "object" && value !== null;
}

function readRequiredString(value: Record<string, unknown>, key: string): string | null {
	return typeof value[key] === "string" ? value[key] : null;
}

function readRequiredNumber(value: Record<string, unknown>, key: string): number | null {
	return typeof value[key] === "number" ? value[key] : null;
}

function parseCanvasNodeData(value: unknown): CanvasFileNodeData | null {
	if (!isRecord(value)) {
		return null;
	}

	const id = readRequiredString(value, "id");
	const type = readRequiredString(value, "type");
	const x = readRequiredNumber(value, "x");
	const y = readRequiredNumber(value, "y");
	const width = readRequiredNumber(value, "width");
	const height = readRequiredNumber(value, "height");

	if (!id || !type || x === null || y === null || width === null || height === null) {
		return null;
	}

	return {
		id,
		type,
		x,
		y,
		width,
		height,
		text: typeof value.text === "string" ? value.text : undefined,
		file: typeof value.file === "string" ? value.file : undefined,
	};
}

function parseCanvasEdgeData(value: unknown): CanvasFileEdgeData | null {
	if (!isRecord(value)) {
		return null;
	}

	const id = readRequiredString(value, "id");
	const fromNode = readRequiredString(value, "fromNode");
	const toNode = readRequiredString(value, "toNode");

	if (!id || !fromNode || !toNode) {
		return null;
	}

	return {
		id,
		fromNode,
		toNode,
		label: typeof value.label === "string" ? value.label : undefined,
	};
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

function normalizeTextForContext(text: string): string {
	return text
		.replace(/\r\n?/g, "\n")
		.split("\n")
		.map((line) => line.replace(/[ \t]+/g, " ").trim())
		.join("\n")
		.replace(/\n{3,}/g, "\n\n")
		.trim();
}

function compressTextForContext(text: string, maxChars: number): string | undefined {
	if (maxChars <= 0) {
		return undefined;
	}

	const normalized = normalizeTextForContext(text);

	if (normalized.length === 0) {
		return undefined;
	}

	if (normalized.length <= maxChars) {
		return normalized;
	}

	if (maxChars <= EXCERPT_SEPARATOR.length + 8) {
		return normalized.slice(0, maxChars).trim();
	}

	const remainingChars = maxChars - EXCERPT_SEPARATOR.length;
	const headChars = Math.max(1, Math.ceil(remainingChars * 0.7));
	const tailChars = Math.max(1, remainingChars - headChars);

	return [
		normalized.slice(0, headChars).trim(),
		EXCERPT_SEPARATOR.trim(),
		normalized.slice(normalized.length - tailChars).trim(),
	].join("\n");
}

function buildStructuredNodeContext(
	node: SelectedCanvasNodeInfo,
	index: number,
): ContextPacketNode {
	return {
		index: index + 1,
		id: node.id,
		type: node.type,
		position: {
			x: node.x,
			y: node.y,
		},
		size: {
			width: node.width,
			height: node.height,
		},
		text: typeof node.text === "string" ? compressTextForContext(node.text, Number.MAX_SAFE_INTEGER) : undefined,
		file: typeof node.file === "string" && node.file.trim().length > 0 ? node.file.trim() : undefined,
	};
}

function normalizeCanvasDataNode(node: CanvasFileNodeData): SelectedCanvasNodeInfo {
	const normalizedType = node.type === "text" || node.type === "file" ? node.type : "unknown";

	return {
		id: node.id,
		type: normalizedType,
		x: node.x,
		y: node.y,
		width: node.width,
		height: node.height,
		text: node.type === "text" ? node.text : undefined,
		file: node.type === "file" ? node.file : undefined,
	};
}

function buildLimitedContextNode(
	node: SelectedCanvasNodeInfo,
	index: number,
	maxTextChars: number,
): ContextPacketNode {
	const contextNode = buildStructuredNodeContext(node, index);

	if (typeof contextNode.text === "string") {
		return {
			...contextNode,
			text: compressTextForContext(contextNode.text, maxTextChars),
		};
	}

	return contextNode;
}

function parseCanvasData(canvasText?: string): CanvasFileData | null {
	if (typeof canvasText !== "string" || canvasText.trim().length === 0) {
		return null;
	}

	try {
		const parsed = JSON.parse(canvasText) as unknown;

		if (!isRecord(parsed) || !Array.isArray(parsed.nodes) || !Array.isArray(parsed.edges)) {
			return null;
		}

		return {
			nodes: parsed.nodes
				.map(parseCanvasNodeData)
				.filter((node): node is CanvasFileNodeData => node !== null),
			edges: parsed.edges
				.map(parseCanvasEdgeData)
				.filter((edge): edge is CanvasFileEdgeData => edge !== null),
		};
	} catch {
		return null;
	}
}

function collectDirectNeighborIds(
	selectedIds: Set<string>,
	edges: CanvasFileEdgeData[],
): Map<string, Set<string>> {
	const neighborToSelectedIds = new Map<string, Set<string>>();

	for (const edge of edges) {
		const fromSelected = selectedIds.has(edge.fromNode);
		const toSelected = selectedIds.has(edge.toNode);

		if (fromSelected === toSelected) {
			continue;
		}

		const relatedNodeId = fromSelected ? edge.toNode : edge.fromNode;
		const selectedNodeId = fromSelected ? edge.fromNode : edge.toNode;
		const connectedSelectedIds = neighborToSelectedIds.get(relatedNodeId) ?? new Set<string>();

		connectedSelectedIds.add(selectedNodeId);
		neighborToSelectedIds.set(relatedNodeId, connectedSelectedIds);
	}

	return neighborToSelectedIds;
}

function buildRelatedContextSection(
	selectedNodes: SelectedCanvasNodeInfo[],
	canvasData: CanvasFileData | null,
): RelatedContextSection | undefined {
	if (!canvasData) {
		return undefined;
	}

	const selectedIds = new Set(selectedNodes.map((node) => node.id).filter((id) => id.length > 0));

	if (selectedIds.size === 0) {
		return undefined;
	}

	const neighborToSelectedIds = collectDirectNeighborIds(selectedIds, canvasData.edges);

	if (neighborToSelectedIds.size === 0) {
		return undefined;
	}

	const nodeById = new Map<string, CanvasFileNodeData>(
		canvasData.nodes.map((node) => [node.id, node]),
	);

	const candidateNodes = Array.from(neighborToSelectedIds.entries())
		.map(([nodeId, connectedSelectedIds]) => {
			const canvasNode = nodeById.get(nodeId);

			if (!canvasNode || selectedIds.has(nodeId)) {
				return null;
			}

			const normalizedNode = normalizeCanvasDataNode(canvasNode);
			const hasReadableContent = typeof normalizedNode.text === "string" || typeof normalizedNode.file === "string";
			const connectionCount = connectedSelectedIds.size;
			const score = connectionCount + (hasReadableContent ? 1 : 0);

			return {
				score,
				connectionCount,
				viaSelectedNodeIds: Array.from(connectedSelectedIds).sort(),
				node: normalizedNode,
				hasReadableContent,
			};
		})
		.filter((item): item is NonNullable<typeof item> => item !== null)
		.sort((left, right) => {
			if (right.score !== left.score) return right.score - left.score;
			if (right.connectionCount !== left.connectionCount) return right.connectionCount - left.connectionCount;
			if (left.hasReadableContent !== right.hasReadableContent) return Number(right.hasReadableContent) - Number(left.hasReadableContent);
			return left.node.id.localeCompare(right.node.id);
		});

	if (candidateNodes.length === 0) {
		return undefined;
	}

	const limitedCandidates = candidateNodes.slice(0, MAX_RELATED_ITEMS);
	const items: RelatedContextItem[] = limitedCandidates.map((candidate, index) => ({
		score: candidate.score,
		connectionCount: candidate.connectionCount,
		viaSelectedNodeIds: candidate.viaSelectedNodeIds,
		node: buildLimitedContextNode(candidate.node, index, MAX_RELATED_NODE_TEXT_CHARS),
	}));

	return {
		itemCount: items.length,
		omittedItemCount: Math.max(0, candidateNodes.length - items.length),
		items,
	};
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
	const structuredNodes = nodes.map(buildStructuredNodeContext);
	const budgetedResult = applyTextBudget(structuredNodes);
	const related = buildRelatedContextSection(nodes, parseCanvasData(canvasText));
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
