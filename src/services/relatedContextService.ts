import type {
	CanvasFileData,
	CanvasFileEdgeData,
	CanvasFileNodeData,
	SelectedCanvasNodeInfo,
} from "../canvasTypes";
import type {
	RelatedContextItem,
	RelatedContextSection,
} from "../contextTypes";
import {buildContextPacketNode} from "./contextNodeBuilder";

export type RelatedContextOptions = {
	maxRelatedItems: number;
	maxRelatedNodeTextChars: number;
};

type RelatedNodeCandidate = {
	connectionCount: number;
	viaSelectedNodeIds: string[];
	node: SelectedCanvasNodeInfo;
	hasReadableContent: boolean;
};

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

function buildRelatedNodeCandidates(
	neighborToSelectedIds: Map<string, Set<string>>,
	selectedIds: Set<string>,
	nodes: CanvasFileNodeData[],
): RelatedNodeCandidate[] {
	const nodeById = new Map<string, CanvasFileNodeData>(
		nodes.map((node) => [node.id, node]),
	);

	return Array.from(neighborToSelectedIds.entries())
		.map(([nodeId, connectedSelectedIds]) => {
			const canvasNode = nodeById.get(nodeId);

			if (!canvasNode || selectedIds.has(nodeId)) {
				return null;
			}

			const normalizedNode = normalizeCanvasDataNode(canvasNode);
			const hasReadableContent = typeof normalizedNode.text === "string" || typeof normalizedNode.file === "string";

			return {
				connectionCount: connectedSelectedIds.size,
				viaSelectedNodeIds: Array.from(connectedSelectedIds).sort(),
				node: normalizedNode,
				hasReadableContent,
			};
		})
		.filter((candidate): candidate is RelatedNodeCandidate => candidate !== null);
}

function scoreRelatedCandidate(candidate: RelatedNodeCandidate): number {
	return candidate.connectionCount + (candidate.hasReadableContent ? 1 : 0);
}

function compareRelatedCandidates(left: RelatedNodeCandidate, right: RelatedNodeCandidate): number {
	const leftScore = scoreRelatedCandidate(left);
	const rightScore = scoreRelatedCandidate(right);

	if (rightScore !== leftScore) return rightScore - leftScore;
	if (right.connectionCount !== left.connectionCount) return right.connectionCount - left.connectionCount;
	if (left.hasReadableContent !== right.hasReadableContent) return Number(right.hasReadableContent) - Number(left.hasReadableContent);
	return left.node.id.localeCompare(right.node.id);
}

export function buildRelatedContextSection(
	selectedNodes: SelectedCanvasNodeInfo[],
	canvasData: CanvasFileData | null,
	options: RelatedContextOptions,
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

	const candidateNodes = buildRelatedNodeCandidates(neighborToSelectedIds, selectedIds, canvasData.nodes)
		.sort(compareRelatedCandidates);

	if (candidateNodes.length === 0) {
		return undefined;
	}

	const limitedCandidates = candidateNodes.slice(0, options.maxRelatedItems);
	const items: RelatedContextItem[] = limitedCandidates.map((candidate, index) => ({
		score: scoreRelatedCandidate(candidate),
		connectionCount: candidate.connectionCount,
		viaSelectedNodeIds: candidate.viaSelectedNodeIds,
		node: buildContextPacketNode(candidate.node, index, {maxTextChars: options.maxRelatedNodeTextChars}),
	}));

	return {
		itemCount: items.length,
		omittedItemCount: Math.max(0, candidateNodes.length - items.length),
		items,
	};
}
