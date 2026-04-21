import type {
	CanvasFileData,
	CanvasFileEdgeData,
	CanvasFileNodeData,
	SelectedCanvasNodeInfo,
} from "../canvasTypes";
import type {
	ContextPacketNode,
	RelatedContextItem,
	RelatedContextSection,
} from "../contextTypes";
import {compressTextForContext} from "./contextText";

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

export function buildRelatedContextSection(
	selectedNodes: SelectedCanvasNodeInfo[],
	canvasData: CanvasFileData | null,
	maxRelatedItems: number,
	maxRelatedNodeTextChars: number,
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

	const limitedCandidates = candidateNodes.slice(0, maxRelatedItems);
	const items: RelatedContextItem[] = limitedCandidates.map((candidate, index) => ({
		score: candidate.score,
		connectionCount: candidate.connectionCount,
		viaSelectedNodeIds: candidate.viaSelectedNodeIds,
		node: buildLimitedContextNode(candidate.node, index, maxRelatedNodeTextChars),
	}));

	return {
		itemCount: items.length,
		omittedItemCount: Math.max(0, candidateNodes.length - items.length),
		items,
	};
}
