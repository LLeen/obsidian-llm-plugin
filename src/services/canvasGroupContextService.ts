import type {
	CanvasFileData,
	CanvasFileNodeData,
	CanvasGroupPathItem,
	SelectedCanvasNodeInfo,
} from "../canvasTypes";
import {classifyCanvasFileReference} from "./canvasFileReferenceService";

type NodeBounds = {
	x: number;
	y: number;
	width: number;
	height: number;
};

type GroupContextSource = SelectedCanvasNodeInfo & NodeBounds;

type GroupContextCollectionState = {
	emittedIds: Set<string>;
	visitedGroupIds: Set<string>;
	excludedNodeIds: Set<string>;
	groupNodes: CanvasFileNodeData[];
};

function hasBounds<T extends Partial<NodeBounds>>(node: T): node is T & NodeBounds {
	return (
		typeof node.x === "number"
		&& typeof node.y === "number"
		&& typeof node.width === "number"
		&& typeof node.height === "number"
	);
}

function getBoundsArea(node: NodeBounds): number {
	return node.width * node.height;
}

function isInsideGroup(node: NodeBounds, group: NodeBounds): boolean {
	return (
		node.x >= group.x
		&& node.y >= group.y
		&& node.x + node.width <= group.x + group.width
		&& node.y + node.height <= group.y + group.height
	);
}

export function isGroupContextSource(node: SelectedCanvasNodeInfo): node is GroupContextSource {
	return node.type === "group" && hasBounds(node);
}

function toGroupPathItem(group: GroupContextSource | CanvasFileNodeData): CanvasGroupPathItem {
	return {
		id: group.id,
		label: group.label,
	};
}

function toGroupContextSource(node: CanvasFileNodeData): GroupContextSource | null {
	if (node.type !== "group" || !hasBounds(node)) {
		return null;
	}

	return {
		id: node.id,
		type: "group",
		x: node.x,
		y: node.y,
		width: node.width,
		height: node.height,
		label: node.label,
	};
}

function isDirectChildOfGroup(
	node: CanvasFileNodeData,
	group: GroupContextSource,
	groupNodes: CanvasFileNodeData[],
): boolean {
	if (node.id === group.id || !hasBounds(node) || !isInsideGroup(node, group)) {
		return false;
	}

	const containingNestedGroups = groupNodes.filter((candidate) => {
		if (candidate.id === group.id || candidate.id === node.id || !hasBounds(candidate)) {
			return false;
		}

		return isInsideGroup(candidate, group) && isInsideGroup(node, candidate);
	});

	if (containingNestedGroups.length === 0) {
		return true;
	}

	const nearestNestedGroup = containingNestedGroups
		.sort((left, right) => getBoundsArea(left) - getBoundsArea(right))[0];

	return nearestNestedGroup?.id === node.id;
}

function normalizeReadableGroupNode(
	node: CanvasFileNodeData,
	group: GroupContextSource,
	sourceGroupPath: CanvasGroupPathItem[],
): SelectedCanvasNodeInfo | null {
	if (node.type === "text") {
		return {
			id: node.id,
			type: "text",
			x: node.x,
			y: node.y,
			width: node.width,
			height: node.height,
			text: node.text,
			textSource: typeof node.text === "string" ? "canvas-text" : undefined,
			sourceGroupId: group.id,
			sourceGroupLabel: group.label,
			sourceGroupPath,
		};
	}

	if (node.type !== "file") {
		return null;
	}

	const fileClassification = classifyCanvasFileReference(node.file);

	if (fileClassification.fileKind !== "markdown" && fileClassification.fileKind !== "pdf") {
		return null;
	}

	return {
		id: node.id,
		type: "file",
		x: node.x,
		y: node.y,
		width: node.width,
		height: node.height,
		file: node.file,
		fileKind: fileClassification.fileKind,
		fileExtension: fileClassification.fileExtension,
		sourceGroupId: group.id,
		sourceGroupLabel: group.label,
		sourceGroupPath,
	};
}

function collectReadableNodesInsideGroup(
	group: GroupContextSource,
	canvasNodes: CanvasFileNodeData[],
	sourceGroupPath: CanvasGroupPathItem[],
	state: GroupContextCollectionState,
): SelectedCanvasNodeInfo[] {
	if (state.visitedGroupIds.has(group.id)) {
		return [];
	}

	state.visitedGroupIds.add(group.id);

	const groupContextNodes: SelectedCanvasNodeInfo[] = [];

	for (const canvasNode of canvasNodes) {
		if (
			state.excludedNodeIds.has(canvasNode.id)
			|| state.emittedIds.has(canvasNode.id)
			|| !isDirectChildOfGroup(canvasNode, group, state.groupNodes)
		) {
			continue;
		}

		if (canvasNode.type === "group") {
			const nestedGroup = toGroupContextSource(canvasNode);

			if (!nestedGroup) {
				continue;
			}

			groupContextNodes.push(...collectReadableNodesInsideGroup(
				nestedGroup,
				canvasNodes,
				[...sourceGroupPath, toGroupPathItem(nestedGroup)],
				state,
			));
			continue;
		}

		const normalizedNode = normalizeReadableGroupNode(canvasNode, group, sourceGroupPath);

		if (!normalizedNode) {
			continue;
		}

		groupContextNodes.push(normalizedNode);
		state.emittedIds.add(canvasNode.id);
	}

	return groupContextNodes;
}

export function collectReadableNodesInsideGroups(
	groupSources: SelectedCanvasNodeInfo[],
	canvasData: CanvasFileData | null,
	excludedNodeIds: Set<string> = new Set<string>(),
): SelectedCanvasNodeInfo[] {
	if (!canvasData) {
		return [];
	}

	const selectedGroups = groupSources.filter(isGroupContextSource);
	const groupContextNodes: SelectedCanvasNodeInfo[] = [];
	const state: GroupContextCollectionState = {
		emittedIds: new Set<string>(),
		visitedGroupIds: new Set<string>(),
		excludedNodeIds,
		groupNodes: canvasData.nodes.filter((node) => node.type === "group" && hasBounds(node)),
	};

	for (const group of selectedGroups) {
		groupContextNodes.push(...collectReadableNodesInsideGroup(
			group,
			canvasData.nodes,
			[toGroupPathItem(group)],
			state,
		));
	}

	return groupContextNodes;
}

export function collectReadableNodesInsideSelectedGroups(
	selectedNodes: SelectedCanvasNodeInfo[],
	canvasData: CanvasFileData | null,
): SelectedCanvasNodeInfo[] {
	const selectedIds = new Set(selectedNodes.map((node) => node.id).filter((id) => id.length > 0));

	return collectReadableNodesInsideGroups(selectedNodes, canvasData, selectedIds);
}
