import {App, normalizePath} from "obsidian";
import type {
	CanvasFileContentStatus,
	CanvasFileKind,
	SelectedCanvasNodeInfo,
} from "../canvasTypes";

const MARKDOWN_EXTENSIONS = new Set(["md"]);
const IMAGE_EXTENSIONS = new Set(["png", "jpg", "jpeg", "gif", "webp", "svg", "bmp", "avif"]);
const PDF_EXTENSIONS = new Set(["pdf"]);

export type CanvasFileReferenceClassification = {
	fileKind: CanvasFileKind;
	fileExtension?: string;
};

export type MarkdownFileContentSummary = {
	readCount: number;
	unsupportedCount: number;
	missingCount: number;
	errorCount: number;
};

function getFileExtension(filePath?: string): string | undefined {
	const trimmedPath = normalizeCanvasFilePath(filePath);

	if (!trimmedPath) {
		return undefined;
	}

	const fileName = trimmedPath.split(/[\\/]/).pop() ?? trimmedPath;
	const extensionStart = fileName.lastIndexOf(".");

	if (extensionStart < 0 || extensionStart === fileName.length - 1) {
		return undefined;
	}

	return fileName.slice(extensionStart + 1).toLowerCase();
}

export function normalizeCanvasFilePath(filePath?: string): string | undefined {
	const trimmedPath = filePath?.trim();

	if (!trimmedPath) {
		return undefined;
	}

	const unwrappedPath = trimmedPath.startsWith("[[") && trimmedPath.endsWith("]]")
		? trimmedPath.slice(2, -2).trim()
		: trimmedPath;

	return unwrappedPath
		.split("#", 1)[0]
		?.split("?", 1)[0]
		?.split("|", 1)[0]
		?.trim();
}

export function classifyCanvasFileReference(filePath?: string): CanvasFileReferenceClassification {
	const fileExtension = getFileExtension(filePath);

	if (!fileExtension) {
		return {
			fileKind: "unknown",
		};
	}

	if (MARKDOWN_EXTENSIONS.has(fileExtension)) {
		return {
			fileKind: "markdown",
			fileExtension,
		};
	}

	if (IMAGE_EXTENSIONS.has(fileExtension)) {
		return {
			fileKind: "image",
			fileExtension,
		};
	}

	if (PDF_EXTENSIONS.has(fileExtension)) {
		return {
			fileKind: "pdf",
			fileExtension,
		};
	}

	return {
		fileKind: "unsupported",
		fileExtension,
	};
}

function countStatus(nodes: SelectedCanvasNodeInfo[], status: CanvasFileContentStatus): number {
	return nodes.filter((node) => node.fileContentStatus === status).length;
}

export async function readSelectedMarkdownFileContents(
	app: App,
	nodes: SelectedCanvasNodeInfo[],
): Promise<{
	nodes: SelectedCanvasNodeInfo[];
	summary: MarkdownFileContentSummary;
}> {
	const enrichedNodes = await Promise.all(nodes.map(async (node): Promise<SelectedCanvasNodeInfo> => {
		if (node.type !== "file") {
			return {
				...node,
				fileContentStatus: "not-file",
			};
		}

		if (node.fileKind !== "markdown" || typeof node.file !== "string" || node.file.trim().length === 0) {
			return {
				...node,
				fileContentStatus: "unsupported",
			};
		}

		const normalizedFilePath = normalizeCanvasFilePath(node.file);
		const file = normalizedFilePath
			? app.vault.getFileByPath(normalizePath(normalizedFilePath))
			: null;

		if (!file) {
			return {
				...node,
				fileContentStatus: "missing",
			};
		}

		try {
			const text = await app.vault.cachedRead(file);

			return {
				...node,
				text,
				textSource: "markdown-file",
				fileContentStatus: "read",
			};
		} catch (error) {
			console.debug("Failed to read Canvas Markdown file reference:", {
				file: node.file,
				error,
			});

			return {
				...node,
				fileContentStatus: "error",
			};
		}
	}));

	return {
		nodes: enrichedNodes,
		summary: {
			readCount: countStatus(enrichedNodes, "read"),
			unsupportedCount: countStatus(enrichedNodes, "unsupported"),
			missingCount: countStatus(enrichedNodes, "missing"),
			errorCount: countStatus(enrichedNodes, "error"),
		},
	};
}
