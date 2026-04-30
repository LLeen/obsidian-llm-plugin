import type {CanvasFileData, CanvasFileEdgeData} from "../canvasTypes";
import type {ContextPacket, ContextPacketNode, RelatedContextItem} from "../contextTypes";
import {DEFAULT_SYSTEM_PROMPT} from "./llm/prompts";

export type RenderContextPacketPromptOptions = {
	systemPrompt?: string;
	userQuestion: string;
	canvasData?: CanvasFileData | null;
};

const LOCAL_PROMPT_PREFIX = "/本地提示词";

function getNodeText(node: ContextPacketNode): string | undefined {
	const text = node.text?.trim();

	return text && text.length > 0 ? text : undefined;
}

function getLocalPromptText(node: ContextPacketNode): string | undefined {
	const text = getNodeText(node);

	if (!text?.startsWith(LOCAL_PROMPT_PREFIX)) {
		return undefined;
	}

	return text.slice(LOCAL_PROMPT_PREFIX.length).trim();
}

function isAncestorRelatedItem(item: RelatedContextItem): boolean {
	return item.directions.includes("parent");
}

function collectLocalPromptNodes(packet: ContextPacket): ContextPacketNode[] {
	const primaryInstructionNodes = packet.primary.nodes.filter((node) => getLocalPromptText(node) !== undefined);
	const ancestorInstructionNodes = (packet.related?.items ?? [])
		.filter(isAncestorRelatedItem)
		.flatMap((item) => [item.node, ...(item.groupNodes ?? [])])
		.filter((node) => getLocalPromptText(node) !== undefined);
	const seenIds = new Set<string>();

	return [...primaryInstructionNodes, ...ancestorInstructionNodes].filter((node) => {
		if (seenIds.has(node.id)) {
			return false;
		}

		seenIds.add(node.id);
		return true;
	});
}

function collectPromptNodeIds(packet: ContextPacket): Set<string> {
	const nodeIds = new Set<string>();

	for (const node of packet.primary.nodes) {
		nodeIds.add(node.id);
	}

	for (const item of packet.related?.items ?? []) {
		nodeIds.add(item.node.id);

		for (const groupNode of item.groupNodes ?? []) {
			nodeIds.add(groupNode.id);
		}
	}

	return nodeIds;
}

function buildNodeTypeById(packet: ContextPacket): Map<string, string> {
	const nodeTypeById = new Map<string, string>();

	for (const node of packet.primary.nodes) {
		nodeTypeById.set(node.id, node.type);
	}

	for (const item of packet.related?.items ?? []) {
		nodeTypeById.set(item.node.id, item.node.type);

		for (const groupNode of item.groupNodes ?? []) {
			nodeTypeById.set(groupNode.id, groupNode.type);
		}
	}

	return nodeTypeById;
}

function escapeMermaidLabel(value: string): string {
	return value.replace(/\\/g, "\\\\").replace(/"/g, '\\"').replace(/\r?\n/g, " ");
}

function renderMermaidGraph(packet: ContextPacket, canvasData?: CanvasFileData | null): string {
	const promptNodeIds = collectPromptNodeIds(packet);
	const nodeTypeById = buildNodeTypeById(packet);
	const graphEdges = canvasData?.edges.filter((edge) =>
		promptNodeIds.has(edge.fromNode) && promptNodeIds.has(edge.toNode),
	) ?? [];

	if (graphEdges.length === 0) {
		return "暂无可序列化拓扑边";
	}

	const mermaidIdByNodeId = new Map<string, string>();
	let nextId = 1;

	function getMermaidId(nodeId: string): string {
		const existingId = mermaidIdByNodeId.get(nodeId);

		if (existingId) {
			return existingId;
		}

		const mermaidId = `node${nextId}`;

		nextId += 1;
		mermaidIdByNodeId.set(nodeId, mermaidId);
		return mermaidId;
	}

	function renderEndpoint(nodeId: string): string {
		const nodeType = nodeTypeById.get(nodeId) ?? "unknown";
		const label = escapeMermaidLabel(`${nodeType}:${nodeId}`);

		return `${getMermaidId(nodeId)}["${label}"]`;
	}

	return [
		"```mermaid",
		"graph TD",
		...graphEdges.map((edge: CanvasFileEdgeData) => `  ${renderEndpoint(edge.fromNode)} --> ${renderEndpoint(edge.toNode)}`),
		"```",
	].join("\n");
}

function renderSourceGroupPath(node: ContextPacketNode): string | undefined {
	if (!node.sourceGroupPath || node.sourceGroupPath.length === 0) {
		return undefined;
	}

	return node.sourceGroupPath
		.map((group) => group.label ? `${group.label}(${group.id})` : group.id)
		.join(" > ");
}

function renderNodeMetadata(node: ContextPacketNode): string {
	const groupPath = renderSourceGroupPath(node);
	const metadata = [
		`id=${node.id}`,
		`type=${node.type}`,
		node.textSource ? `textSource=${node.textSource}` : undefined,
		node.file ? `file=${node.file}` : undefined,
		node.fileKind ? `fileKind=${node.fileKind}` : undefined,
		node.fileContentStatus ? `fileContentStatus=${node.fileContentStatus}` : undefined,
		node.sourceGroupId ? `sourceGroupId=${node.sourceGroupId}` : undefined,
		node.sourceGroupLabel ? `sourceGroupLabel=${node.sourceGroupLabel}` : undefined,
		groupPath ? `sourceGroupPath=${groupPath}` : undefined,
	].filter((value): value is string => typeof value === "string");

	return metadata.join("; ");
}

function renderNodeText(node: ContextPacketNode): string {
	const text = getNodeText(node);

	if (!text) {
		return "";
	}

	return [
		"文本:",
		text,
	].join("\n");
}

function renderContextNode(node: ContextPacketNode, title: string): string {
	const text = renderNodeText(node);

	return [
		`### ${title}`,
		`- ${renderNodeMetadata(node)}`,
		text,
	].filter((part) => part.trim().length > 0).join("\n");
}

function renderLocalInstructions(packet: ContextPacket): string {
	const localPromptNodes = collectLocalPromptNodes(packet);

	if (localPromptNodes.length === 0) {
		return "暂无局部指令";
	}

	return localPromptNodes.map((node, index) => {
		const instructionText = getLocalPromptText(node) ?? "";

		return [
			`### 局部指令 ${index + 1}`,
			`- ${renderNodeMetadata(node)}`,
			instructionText,
		].join("\n");
	}).join("\n\n");
}

function renderPrimaryContext(packet: ContextPacket): string {
	if (packet.primary.nodes.length === 0) {
		return "暂无选中节点";
	}

	return packet.primary.nodes
		.map((node) => renderContextNode(node, `选中节点 ${node.index}`))
		.join("\n\n");
}

function renderRelatedItem(item: RelatedContextItem, index: number): string {
	const relatedNode = renderContextNode(item.node, `相关节点 ${index + 1}`);
	const relatedMetadata = [
		`- score=${item.score}`,
		`- minHop=${item.minHop}`,
		`- directions=${item.directions.join(",") || "none"}`,
		`- connectionCount=${item.connectionCount}`,
		`- viaSelectedNodeIds=${item.viaSelectedNodeIds.join(",") || "none"}`,
	].join("\n");
	const groupNodes = item.groupNodes?.map((node, groupNodeIndex) =>
		renderContextNode(node, `相关 Group 内节点 ${groupNodeIndex + 1}`),
	).join("\n\n");

	return [
		relatedNode,
		relatedMetadata,
		groupNodes,
	].filter((part): part is string => typeof part === "string" && part.trim().length > 0).join("\n\n");
}

function renderRelatedContext(packet: ContextPacket): string {
	const relatedItems = packet.related?.items ?? [];

	if (relatedItems.length === 0) {
		return "暂无相关节点";
	}

	return relatedItems
		.map((item, index) => renderRelatedItem(item, index))
		.join("\n\n");
}

function renderHistoricalContext(packet: ContextPacket): string {
	return [
		"## 选中节点",
		renderPrimaryContext(packet),
		"",
		"## 相关节点",
		renderRelatedContext(packet),
	].join("\n");
}

export function renderContextPacketPrompt(
	packet: ContextPacket,
	options: RenderContextPacketPromptOptions,
): string {
	const systemPrompt = options.systemPrompt?.trim() || DEFAULT_SYSTEM_PROMPT;

	return [
		"<<全局设定>>",
		systemPrompt,
		"",
		"<<局部指令>>",
		renderLocalInstructions(packet),
		"",
		"<<思维导图拓扑关系 (Graph TD)>>",
		renderMermaidGraph(packet, options.canvasData),
		"",
		"<<历史背景资料>>",
		renderHistoricalContext(packet),
		"",
		"<<本轮问题>>",
		options.userQuestion,
	].join("\n");
}
