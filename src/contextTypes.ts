import type {
	CanvasFileContentStatus,
	CanvasFileKind,
	CanvasGroupPathItem,
	CanvasNodeTextSource,
} from "./canvasTypes";

export type ContextPacketNode = {
index: number;
id: string;
type: "text" | "file" | "group" | "unknown";
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
sourceGroupId?: string;
sourceGroupLabel?: string;
sourceGroupPath?: CanvasGroupPathItem[];
};

export type ContextPacketSection = {
nodeCount: number;
textNodeCount: number;
fileNodeCount: number;
truncated: boolean;
omittedNodeCount: number;
nodes: ContextPacketNode[];
};

export type RelatedContextDirection = "parent" | "child";

export type RelatedContextItem = {
score: number;
minHop: number;
directions: RelatedContextDirection[];
connectionCount: number;
viaSelectedNodeIds: string[];
node: ContextPacketNode;
groupNodes?: ContextPacketNode[];
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
