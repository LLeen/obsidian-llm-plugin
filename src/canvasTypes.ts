export type CanvasFileKind = "markdown" | "image" | "pdf" | "unsupported" | "unknown";

export type CanvasNodeTextSource = "canvas-text" | "markdown-file";

export type CanvasFileContentStatus = "read" | "missing" | "unsupported" | "error" | "not-file";

export type SelectedCanvasNodeInfo = {
id: string;
type: "text" | "file" | "unknown";
x?: number;
y?: number;
width?: number;
height?: number;
text?: string;
file?: string;
fileKind?: CanvasFileKind;
fileExtension?: string;
textSource?: CanvasNodeTextSource;
fileContentStatus?: CanvasFileContentStatus;
};

export type CanvasFileNodeData = {
id: string;
type: string;
x: number;
y: number;
width: number;
height: number;
text?: string;
file?: string;
};

export type CanvasFileEdgeData = {
id: string;
fromNode: string;
toNode: string;
label?: string;
};

export type CanvasFileData = {
nodes: CanvasFileNodeData[];
edges: CanvasFileEdgeData[];
};

export type CanvasNodeLike = {
id?: string;
type?: unknown;
x?: number;
y?: number;
width?: number;
height?: number;
text?: unknown;
file?: unknown;
data?: {
id?: string;
type?: unknown;
x?: number;
y?: number;
width?: number;
height?: number;
text?: unknown;
file?: unknown;
};
};
