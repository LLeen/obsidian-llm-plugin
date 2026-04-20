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

export type ContextPacketNode = {
index: number;
id: string;
type: "text" | "file" | "unknown";
position?: {
x?: number;
y?: number;
};
size?: {
width?: number;
height?: number;
};
text?: string;
file?: string;
};

export type ContextPacketSection = {
nodeCount: number;
textNodeCount: number;
fileNodeCount: number;
truncated: boolean;
omittedNodeCount: number;
nodes: ContextPacketNode[];
};

export type RelatedContextItem = {
score: number;
connectionCount: number;
viaSelectedNodeIds: string[];
node: ContextPacketNode;
};

export type RelatedContextSection = {
itemCount: number;
omittedItemCount: number;
items: RelatedContextItem[];
};

export type ContextPacket = {
format: "context-packet/v1";
primary: ContextPacketSection;
related?: RelatedContextSection;
limits: {
maxNodeTextChars: number;
maxTotalTextChars: number;
maxRelatedItems: number;
maxRelatedNodeTextChars: number;
};
legacyTextPacket: string;
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
