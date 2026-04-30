import type {App} from "obsidian";
import type {
	CanvasFileData,
	CanvasFileEdgeData,
	CanvasFileNodeData,
	SelectedCanvasNodeInfo,
} from "../canvasTypes";
import type {
	RelatedContextItem,
	RelatedContextSection,
	RelatedContextDirection,
} from "../contextTypes";
import {
	classifyCanvasFileReference,
	readCanvasFileNodeContents,
} from "./canvasFileReferenceService";
import {collectReadableNodesInsideGroups} from "./canvasGroupContextService";
import {buildContextPacketNode} from "./contextNodeBuilder";

export type RelatedContextOptions = {
	maxRelatedItems: number;
	maxRelatedNodeTextChars: number;
	relatedHopDepth?: number;
	includeRelatedParentNodes?: boolean;
	includeRelatedChildNodes?: boolean;
};

type RelatedNodeCandidate = {
	connectionCount: number;
	viaSelectedNodeIds: string[];
	minHop: number;
	directions: RelatedContextDirection[];
	node: SelectedCanvasNodeInfo;
	groupNodes?: SelectedCanvasNodeInfo[];
	hasReadableContent: boolean;
};

type DirectNeighborReference = {
	selectedNodeIds: Set<string>;
	directions: Set<RelatedContextDirection>;
	minHop: number;
};

type TraversalStep = {
	nodeId: string;
	direction: RelatedContextDirection;
};

type TraversalQueueItem = {
	nodeId: string;
	sourceSelectedNodeId: string;
	hop: number;
};

type NormalizedRelatedContextOptions = Required<RelatedContextOptions>;

const DEFAULT_RELATED_HOP_DEPTH = 1;
const MIN_RELATED_HOP_DEPTH = 1;
const MAX_RELATED_HOP_DEPTH = 4;

function normalizeCanvasDataNode(node: CanvasFileNodeData): SelectedCanvasNodeInfo {
	const normalizedType = node.type === "text" || node.type === "file" || node.type === "group" ? node.type : "unknown";
	const file = node.type === "file" ? node.file : undefined;
	const fileClassification = classifyCanvasFileReference(file);

	return {
		id: node.id,
		type: normalizedType,
		x: node.x,
		y: node.y,
		width: node.width,
		height: node.height,
		text: node.type === "text" ? node.text : undefined,
		file,
		label: node.type === "group" ? node.label : undefined,
		fileKind: normalizedType === "file" ? fileClassification.fileKind : undefined,
		fileExtension: normalizedType === "file" ? fileClassification.fileExtension : undefined,
		textSource: node.type === "text" && typeof node.text === "string" ? "canvas-text" : undefined,
	};
}

function clamp(value: number, min: number, max: number): number {
	return Math.min(Math.max(value, min), max);
}

function normalizeRelatedContextOptions(options: RelatedContextOptions): NormalizedRelatedContextOptions {
	return {
		maxRelatedItems: options.maxRelatedItems,
		maxRelatedNodeTextChars: options.maxRelatedNodeTextChars,
		relatedHopDepth: clamp(
			Math.trunc(options.relatedHopDepth ?? DEFAULT_RELATED_HOP_DEPTH),
			MIN_RELATED_HOP_DEPTH,
			MAX_RELATED_HOP_DEPTH,
		),
		includeRelatedParentNodes: options.includeRelatedParentNodes ?? true,
		includeRelatedChildNodes: options.includeRelatedChildNodes ?? true,
	};
}

function buildEdgeIndex(
	edges: CanvasFileEdgeData[],
): {
	parentsByNodeId: Map<string, TraversalStep[]>;
	childrenByNodeId: Map<string, TraversalStep[]>;
} {
	const parentsByNodeId = new Map<string, TraversalStep[]>();
	const childrenByNodeId = new Map<string, TraversalStep[]>();

	for (const edge of edges) {
		const parentSteps = parentsByNodeId.get(edge.toNode) ?? [];
		const childSteps = childrenByNodeId.get(edge.fromNode) ?? [];

		parentSteps.push({
			nodeId: edge.fromNode,
			direction: "parent",
		});
		childSteps.push({
			nodeId: edge.toNode,
			direction: "child",
		});

		parentsByNodeId.set(edge.toNode, parentSteps);
		childrenByNodeId.set(edge.fromNode, childSteps);
	}

	return {
		parentsByNodeId,
		childrenByNodeId,
	};
}

function getTraversalSteps(
	nodeId: string,
	edgeIndex: ReturnType<typeof buildEdgeIndex>,
	options: NormalizedRelatedContextOptions,
): TraversalStep[] {
	return [
		...(options.includeRelatedParentNodes ? edgeIndex.parentsByNodeId.get(nodeId) ?? [] : []),
		...(options.includeRelatedChildNodes ? edgeIndex.childrenByNodeId.get(nodeId) ?? [] : []),
	];
}

function collectRelatedNodeReferences(
	selectedIds: Set<string>,
	edges: CanvasFileEdgeData[],
	options: NormalizedRelatedContextOptions,
): Map<string, DirectNeighborReference> {
	const relatedReferences = new Map<string, DirectNeighborReference>();

	if (!options.includeRelatedParentNodes && !options.includeRelatedChildNodes) {
		return relatedReferences;
	}

	const edgeIndex = buildEdgeIndex(edges);
	const queue: TraversalQueueItem[] = Array.from(selectedIds).map((nodeId) => ({
		nodeId,
		sourceSelectedNodeId: nodeId,
		hop: 0,
	}));
	const visitedHopBySourceAndNode = new Map<string, number>();

	for (const selectedId of selectedIds) {
		visitedHopBySourceAndNode.set(`${selectedId}\u0000${selectedId}`, 0);
	}

	while (queue.length > 0) {
		const current = queue.shift();

		if (!current || current.hop >= options.relatedHopDepth) {
			continue;
		}

		for (const step of getTraversalSteps(current.nodeId, edgeIndex, options)) {
			const nextHop = current.hop + 1;
			const visitedKey = `${current.sourceSelectedNodeId}\u0000${step.nodeId}`;
			const previousHop = visitedHopBySourceAndNode.get(visitedKey);
			const isSelectedNode = selectedIds.has(step.nodeId);

			if (!isSelectedNode) {
				const reference = relatedReferences.get(step.nodeId) ?? {
					selectedNodeIds: new Set<string>(),
					directions: new Set<RelatedContextDirection>(),
					minHop: nextHop,
				};

				reference.selectedNodeIds.add(current.sourceSelectedNodeId);
				reference.directions.add(step.direction);
				reference.minHop = Math.min(reference.minHop, nextHop);
				relatedReferences.set(step.nodeId, reference);
			}

			if (previousHop !== undefined && previousHop <= nextHop) {
				continue;
			}

			visitedHopBySourceAndNode.set(visitedKey, nextHop);

			if (!isSelectedNode) {
				queue.push({
					nodeId: step.nodeId,
					sourceSelectedNodeId: current.sourceSelectedNodeId,
					hop: nextHop,
				});
			}
		}
	}

	return relatedReferences;
}

function sortDirections(directions: Set<RelatedContextDirection>): RelatedContextDirection[] {
	return Array.from(directions).sort((left, right) => {
		if (left === right) return 0;
		return left === "parent" ? -1 : 1;
	});
}

function buildRelatedNodeCandidates(
	neighborReferences: Map<string, DirectNeighborReference>,
	selectedIds: Set<string>,
	nodes: CanvasFileNodeData[],
): RelatedNodeCandidate[] {
	const nodeById = new Map<string, CanvasFileNodeData>(
		nodes.map((node) => [node.id, node]),
	);

	return Array.from(neighborReferences.entries())
		.map(([nodeId, reference]) => {
			const canvasNode = nodeById.get(nodeId);

			if (!canvasNode || selectedIds.has(nodeId)) {
				return null;
			}

			const normalizedNode = normalizeCanvasDataNode(canvasNode);
			const hasReadableContent = typeof normalizedNode.text === "string" || typeof normalizedNode.file === "string";

			return {
				connectionCount: reference.selectedNodeIds.size,
				viaSelectedNodeIds: Array.from(reference.selectedNodeIds).sort(),
				minHop: reference.minHop,
				directions: sortDirections(reference.directions),
				node: normalizedNode,
				hasReadableContent,
			};
		})
		.filter((candidate): candidate is RelatedNodeCandidate => candidate !== null);
}

function getParentDirectionBonus(candidate: RelatedNodeCandidate): number {
	if (candidate.directions.includes("parent")) {
		return 1;
	}

	return 0;
}

function scoreRelatedCandidate(candidate: RelatedNodeCandidate, options: NormalizedRelatedContextOptions): number {
	const hopScore = options.relatedHopDepth - candidate.minHop + 1;

	return (
		candidate.connectionCount * 10
		+ hopScore * 4
		+ (candidate.hasReadableContent ? 2 : 0)
		+ getParentDirectionBonus(candidate)
	);
}

function compareRelatedCandidates(
	left: RelatedNodeCandidate,
	right: RelatedNodeCandidate,
	options: NormalizedRelatedContextOptions,
): number {
	const leftScore = scoreRelatedCandidate(left, options);
	const rightScore = scoreRelatedCandidate(right, options);

	if (rightScore !== leftScore) return rightScore - leftScore;
	if (left.minHop !== right.minHop) return left.minHop - right.minHop;
	if (right.connectionCount !== left.connectionCount) return right.connectionCount - left.connectionCount;
	if (left.hasReadableContent !== right.hasReadableContent) return Number(right.hasReadableContent) - Number(left.hasReadableContent);
	if (getParentDirectionBonus(left) !== getParentDirectionBonus(right)) return getParentDirectionBonus(right) - getParentDirectionBonus(left);
	return left.node.id.localeCompare(right.node.id);
}

function getSortedRelatedCandidates(
	selectedNodes: SelectedCanvasNodeInfo[],
	canvasData: CanvasFileData | null,
	options: NormalizedRelatedContextOptions,
): RelatedNodeCandidate[] {
	if (!canvasData) {
		return [];
	}

	const selectedIds = new Set(selectedNodes.map((node) => node.id).filter((id) => id.length > 0));

	if (selectedIds.size === 0) {
		return [];
	}

	const relatedReferences = collectRelatedNodeReferences(selectedIds, canvasData.edges, options);

	if (relatedReferences.size === 0) {
		return [];
	}

	return buildRelatedNodeCandidates(relatedReferences, selectedIds, canvasData.nodes)
		.sort((left, right) => compareRelatedCandidates(left, right, options));
}

function buildRelatedContextItems(
	candidates: RelatedNodeCandidate[],
	options: NormalizedRelatedContextOptions,
): RelatedContextItem[] {
	return candidates.map((candidate, index) => ({
		score: scoreRelatedCandidate(candidate, options),
		minHop: candidate.minHop,
		directions: candidate.directions,
		connectionCount: candidate.connectionCount,
		viaSelectedNodeIds: candidate.viaSelectedNodeIds,
		node: buildContextPacketNode(candidate.node, index, {maxTextChars: options.maxRelatedNodeTextChars}),
		groupNodes: candidate.groupNodes?.map((node, groupNodeIndex) =>
			buildContextPacketNode(node, groupNodeIndex, {maxTextChars: options.maxRelatedNodeTextChars}),
		),
	}));
}

function getRootSourceGroupId(node: SelectedCanvasNodeInfo): string | undefined {
	return node.sourceGroupPath?.[0]?.id ?? node.sourceGroupId;
}

export function buildRelatedContextSection(
	selectedNodes: SelectedCanvasNodeInfo[],
	canvasData: CanvasFileData | null,
	options: RelatedContextOptions,
): RelatedContextSection | undefined {
	const normalizedOptions = normalizeRelatedContextOptions(options);
	const candidateNodes = getSortedRelatedCandidates(selectedNodes, canvasData, normalizedOptions);

	if (candidateNodes.length === 0) {
		return undefined;
	}

	const limitedCandidates = candidateNodes.slice(0, normalizedOptions.maxRelatedItems);
	const items = buildRelatedContextItems(limitedCandidates, normalizedOptions);

	return {
		itemCount: items.length,
		omittedItemCount: Math.max(0, candidateNodes.length - items.length),
		items,
	};
}

export async function buildRelatedContextSectionWithFileContents(
	app: App,
	selectedNodes: SelectedCanvasNodeInfo[],
	canvasData: CanvasFileData | null,
	options: RelatedContextOptions,
): Promise<RelatedContextSection | undefined> {
	const normalizedOptions = normalizeRelatedContextOptions(options);
	const candidateNodes = getSortedRelatedCandidates(selectedNodes, canvasData, normalizedOptions);

	if (candidateNodes.length === 0) {
		return undefined;
	}

	const limitedCandidates = candidateNodes.slice(0, normalizedOptions.maxRelatedItems);
	const relatedFileNodes = limitedCandidates
		.map((candidate) => candidate.node)
		.filter((node) => node.type === "file");
	const relatedGroupNodes = limitedCandidates
		.map((candidate) => candidate.node)
		.filter((node) => node.type === "group");
	const selectedIds = new Set(selectedNodes.map((node) => node.id).filter((id) => id.length > 0));
	const relatedGroupContextNodes = collectReadableNodesInsideGroups(relatedGroupNodes, canvasData, selectedIds);
	const relatedGroupFileNodes = relatedGroupContextNodes.filter((node) => node.type === "file");
	const relatedFileContents = await readCanvasFileNodeContents(
		app,
		[...relatedFileNodes, ...relatedGroupFileNodes],
	);
	const enrichedFileNodeById = new Map(
		relatedFileContents.nodes.map((node) => [node.id, node]),
	);
	const enrichedGroupContextNodes = relatedGroupContextNodes.map((node) =>
		enrichedFileNodeById.get(node.id) ?? node,
	);
	const groupContextNodesByGroupId = new Map<string, SelectedCanvasNodeInfo[]>();

	for (const groupNode of enrichedGroupContextNodes) {
		const rootGroupId = getRootSourceGroupId(groupNode);

		if (!rootGroupId) {
			continue;
		}

		const groupNodes = groupContextNodesByGroupId.get(rootGroupId) ?? [];

		groupNodes.push(groupNode);
		groupContextNodesByGroupId.set(rootGroupId, groupNodes);
	}

	const enrichedCandidates = limitedCandidates.map((candidate): RelatedNodeCandidate => ({
		...candidate,
		node: enrichedFileNodeById.get(candidate.node.id) ?? candidate.node,
		groupNodes: groupContextNodesByGroupId.get(candidate.node.id),
		hasReadableContent: typeof enrichedFileNodeById.get(candidate.node.id)?.text === "string"
			|| typeof candidate.node.text === "string"
			|| typeof candidate.node.file === "string"
			|| (groupContextNodesByGroupId.get(candidate.node.id)?.some((node) => typeof node.text === "string") ?? false),
	}));
	const items = buildRelatedContextItems(enrichedCandidates, normalizedOptions);

	return {
		itemCount: items.length,
		omittedItemCount: Math.max(0, candidateNodes.length - items.length),
		items,
	};
}
