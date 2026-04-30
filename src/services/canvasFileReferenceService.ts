import {App, normalizePath, TFile} from "obsidian";
import type {
	CanvasFileContentStatus,
	CanvasFileKind,
	SelectedCanvasNodeInfo,
} from "../canvasTypes";

const MARKDOWN_EXTENSIONS = new Set(["md"]);
const IMAGE_EXTENSIONS = new Set(["png", "jpg", "jpeg", "gif", "webp", "svg", "bmp", "avif"]);
const PDF_EXTENSIONS = new Set(["pdf"]);
const NO_EMBEDDED_PDF_TEXT_MESSAGE = "No embedded text found in this PDF. It may be scanned or image-only.";

type PdfDocumentLoadingTask = {
	promise: Promise<PdfDocumentProxy>;
};

type PdfDocumentProxy = {
	numPages: number;
	getPage(pageNumber: number): Promise<PdfPageProxy>;
};

type PdfPageProxy = {
	getTextContent(): Promise<PdfTextContent>;
};

type PdfTextContent = {
	items: unknown[];
};

type PdfJsApi = {
	getDocument(source: {data: Uint8Array}): PdfDocumentLoadingTask;
};

export type CanvasFileReferenceClassification = {
	fileKind: CanvasFileKind;
	fileExtension?: string;
};

export type CanvasFileContentSummary = {
	readCount: number;
	unsupportedCount: number;
	missingCount: number;
	errorCount: number;
	notFileCount: number;
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

export function isPdfPath(path: string): boolean {
	return normalizeCanvasFilePath(path)?.toLowerCase().endsWith(".pdf") ?? false;
}

export function isTextContentItemWithStr(item: unknown): item is {str: string} {
	return (
		typeof item === "object" &&
		item !== null &&
		"str" in item &&
		typeof item.str === "string"
	);
}

function isPdfJsApi(value: unknown): value is PdfJsApi {
	return (
		typeof value === "object" &&
		value !== null &&
		"getDocument" in value &&
		typeof value.getDocument === "function"
	);
}

export function getObsidianPdfJs(): PdfJsApi | null {
	const globalRecord = globalThis as Record<string, unknown>;
	const candidates = [
		globalRecord.pdfjsLib,
		globalRecord.pdfjs,
		globalRecord.PDFJS,
	];

	return candidates.find(isPdfJsApi) ?? null;
}

export async function extractPdfTextFromTFile(app: App, file: TFile): Promise<string> {
	const arrayBuffer = await app.vault.readBinary(file);

	console.debug("Loading PDF without external worker", {
		path: file.path,
		byteLength: arrayBuffer.byteLength,
	});

	const obsidianPdfJs = getObsidianPdfJs();

	if (!obsidianPdfJs) {
		throw new Error("Obsidian PDF.js API is not available for PDF text extraction.");
	}

	const loadingTask = obsidianPdfJs.getDocument({
		data: new Uint8Array(arrayBuffer),
	});

	const pdf = await loadingTask.promise;

	console.debug("Loaded PDF", {
		path: file.path,
		pageCount: pdf.numPages,
	});

	const pages: string[] = [];

	for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber++) {
		const page = await pdf.getPage(pageNumber);
		const textContent = await page.getTextContent();
		const pageText = textContent.items
			.flatMap((item): string[] => isTextContentItemWithStr(item) ? [item.str] : [])
			.join(" ")
			.trim();

		if (pageText.length > 0) {
			pages.push(pageText);
		}
	}

	const result = pages.join("\n\n").trim();

	console.debug("Extracted PDF text", {
		path: file.path,
		textLength: result.length,
	});

	return result.length > 0 ? result : NO_EMBEDDED_PDF_TEXT_MESSAGE;
}

async function readMarkdownFileNode(app: App, node: SelectedCanvasNodeInfo, file: TFile): Promise<SelectedCanvasNodeInfo> {
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
}

async function readPdfFileNode(app: App, node: SelectedCanvasNodeInfo, file: TFile): Promise<SelectedCanvasNodeInfo> {
	try {
		const text = await extractPdfTextFromTFile(app, file);

		return {
			...node,
			text,
			textSource: "pdf-file",
			fileContentStatus: "read",
		};
	} catch (error) {
		console.debug("PDF failed to load or extract text:", {
			file: node.file,
			error,
		});

		return {
			...node,
			fileContentStatus: "error",
		};
	}
}

export async function readSelectedCanvasFileContents(
	app: App,
	nodes: SelectedCanvasNodeInfo[],
): Promise<{
	nodes: SelectedCanvasNodeInfo[];
	summary: CanvasFileContentSummary;
}> {
	console.debug("Reading selected Canvas file content", {
		selectedNodeCount: nodes.length,
	});

	const enrichedNodes = await Promise.all(nodes.map(async (node): Promise<SelectedCanvasNodeInfo> => {
		if (node.type !== "file") {
			console.debug("Selected Canvas node is not a file node", {
				id: node.id,
				type: node.type,
			});

			return {
				...node,
				fileContentStatus: "not-file",
			};
		}

		if (typeof node.file !== "string" || node.file.trim().length === 0) {
			console.debug("Canvas file node has no file path", {
				id: node.id,
			});

			return {
				...node,
				fileContentStatus: "unsupported",
			};
		}

		const normalizedFilePath = normalizeCanvasFilePath(node.file);
		const isPdf = normalizedFilePath ? isPdfPath(normalizedFilePath) : false;

		console.debug("Selected Canvas file node path", {
			path: normalizedFilePath,
			isPdf,
			fileKind: node.fileKind,
		});

		if (node.fileKind !== "markdown" && node.fileKind !== "pdf") {
			console.debug("Canvas file node references unsupported file kind", {
				path: normalizedFilePath,
				fileKind: node.fileKind,
			});

			return {
				...node,
				fileContentStatus: "unsupported",
			};
		}

		if (node.fileKind === "pdf" && !isPdf) {
			console.debug("Canvas file node classified as PDF but path is not a PDF", {
				path: normalizedFilePath,
			});

			return {
				...node,
				fileContentStatus: "unsupported",
			};
		}

		const file = normalizedFilePath
			? app.vault.getAbstractFileByPath(normalizePath(normalizedFilePath))
			: null;

		if (!file) {
			console.debug("Referenced vault file was not found", {
				path: normalizedFilePath,
			});

			return {
				...node,
				fileContentStatus: "missing",
			};
		}

		if (!(file instanceof TFile)) {
			console.debug("Referenced vault path did not resolve to a TFile", {
				path: normalizedFilePath,
			});

			return {
				...node,
				fileContentStatus: "error",
			};
		}

		if (node.fileKind === "markdown") {
			return readMarkdownFileNode(app, node, file);
		}

		return readPdfFileNode(app, node, file);
	}));

	return {
		nodes: enrichedNodes,
		summary: {
			readCount: countStatus(enrichedNodes, "read"),
			unsupportedCount: countStatus(enrichedNodes, "unsupported"),
			missingCount: countStatus(enrichedNodes, "missing"),
			errorCount: countStatus(enrichedNodes, "error"),
			notFileCount: countStatus(enrichedNodes, "not-file"),
		},
	};
}

export const readSelectedMarkdownFileContents = readSelectedCanvasFileContents;
