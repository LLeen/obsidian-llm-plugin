export type SelectedCanvasNodeInfo = {
id: string;
type: "text" | "file" | "unknown";
x?: number;
y?: number;
width?: number;
height?: number;
text?: string;
file?: string;
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
