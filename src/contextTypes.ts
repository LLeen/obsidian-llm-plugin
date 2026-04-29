import type {CanvasFileContentStatus, CanvasFileKind, CanvasNodeTextSource} from "./canvasTypes";

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
fileKind?: CanvasFileKind;
fileExtension?: string;
textSource?: CanvasNodeTextSource;
fileContentStatus?: CanvasFileContentStatus;
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
