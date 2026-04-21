import type {SelectedCanvasNodeInfo} from "../canvasTypes";
import type {ContextPacketNode} from "../contextTypes";
import {compressTextForContext} from "./contextText";

type ContextPacketNodeOptions = {
	maxTextChars?: number;
};

export function buildContextPacketNode(
	node: SelectedCanvasNodeInfo,
	index: number,
	options: ContextPacketNodeOptions = {},
): ContextPacketNode {
	const normalizedText = typeof node.text === "string"
		? compressTextForContext(node.text, Number.MAX_SAFE_INTEGER)
		: undefined;
	const text = typeof normalizedText === "string" && typeof options.maxTextChars === "number"
		? compressTextForContext(normalizedText, options.maxTextChars)
		: normalizedText;

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
		text,
		file: typeof node.file === "string" && node.file.trim().length > 0 ? node.file.trim() : undefined,
	};
}
