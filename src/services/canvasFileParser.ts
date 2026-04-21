import type {CanvasFileData, CanvasFileEdgeData, CanvasFileNodeData} from "../canvasTypes";

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

export function parseCanvasData(canvasText?: string): CanvasFileData | null {
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
