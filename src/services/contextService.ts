import type { SelectedCanvasNodeInfo, CanvasNodeLike} from "../types";


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

//save the text info of nodes into a text packet.

 export function buildSelectedNodesTextPacket(nodes: SelectedCanvasNodeInfo[]): string {
		const textParts = nodes
			.filter((node) => typeof node.text === "string" && node.text.trim().length > 0)
			.map((node, index) => {
				return `Node ${index + 1}:\n${node.text}`;
			});

		const result = textParts.join("\n\n---\n\n");
        return result;
	}
