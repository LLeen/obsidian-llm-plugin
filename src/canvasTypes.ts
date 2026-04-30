export type CanvasFileKind = "markdown" | "image" | "pdf" | "unsupported" | "unknown";

export type CanvasNodeTextSource = "canvas-text" | "markdown-file" | "pdf-file";

export type CanvasFileContentStatus = "read" | "missing" | "unsupported" | "error" | "not-file";

export type CanvasGroupPathItem = {
id: string;
label?: string;
};

export type SelectedCanvasNodeInfo = {
id: string;
type: "text" | "file" | "group" | "unknown";
x?: number;
y?: number;
width?: number;
height?: number;
text?: string;
file?: string;
label?: string;
fileKind?: CanvasFileKind;
fileExtension?: string;
textSource?: CanvasNodeTextSource;
fileContentStatus?: CanvasFileContentStatus;
sourceGroupId?: string;
sourceGroupLabel?: string;
sourceGroupPath?: CanvasGroupPathItem[];
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
label?: string;
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

export type CanvasNodeStoredDataLike = {
id?: string;
type?: unknown;
x?: number;
y?: number;
width?: number;
height?: number;
text?: unknown;
file?: unknown;
label?: unknown;
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
label?: unknown;
data?: CanvasNodeStoredDataLike;
unknownData?: CanvasNodeStoredDataLike;
};
