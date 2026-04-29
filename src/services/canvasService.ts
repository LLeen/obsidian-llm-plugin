import {App, ItemView, TFile, WorkspaceLeaf} from "obsidian";
import type {CanvasNodeLike} from "../canvasTypes";

type ActiveCanvasSelectionResult =
	| {status: "not-canvas"}
	| {status: "missing-canvas"}
	| {status: "ok"; selection: CanvasNodeLike[]; canvasFilePath: string};

interface CanvasViewLike extends ItemView {
	canvas?: {
		selection?: Set<CanvasNodeLike>;
	};
	file?: TFile | null;
}

function isCanvasViewLike(value: unknown): value is CanvasViewLike {
	return value instanceof ItemView && value.getViewType() === "canvas";
}

function getCanvasSelection(view: CanvasViewLike): CanvasNodeLike[] {
	return Array.from(view.canvas?.selection ?? []);
}

function getCanvasFilePath(view: CanvasViewLike): string | undefined {
	return view.file?.extension === "canvas" ? view.file.path : undefined;
}

function getCanvasViewFromLeaf(leaf: WorkspaceLeaf | null): CanvasViewLike | null {
	if (!leaf || !isCanvasViewLike(leaf.view)) {
		return null;
	}

	return leaf.view;
}

function getActiveCanvasView(app: App): CanvasViewLike | null {
	const view = app.workspace.getActiveViewOfType(ItemView);

	return isCanvasViewLike(view) ? view : null;
}

function findSelectedCanvasView(app: App): CanvasViewLike | null {
	const activeCanvasView = getActiveCanvasView(app);

	if (activeCanvasView) {
		return activeCanvasView;
	}

	for (const leaf of app.workspace.getLeavesOfType("canvas")) {
		const canvasView = getCanvasViewFromLeaf(leaf);

		if (canvasView && getCanvasSelection(canvasView).length > 0) {
			return canvasView;
		}
	}

	return null;
}

export function getActiveCanvasSelection(app: App): ActiveCanvasSelectionResult {
	const canvasView = findSelectedCanvasView(app);

	if (!canvasView) {
		return {status: "not-canvas"};
	}

	if (!canvasView.canvas) {
		return {status: "missing-canvas"};
	}

	const canvasFilePath = getCanvasFilePath(canvasView);

	if (!canvasFilePath) {
		return {status: "not-canvas"};
	}

	return {
		status: "ok",
		selection: getCanvasSelection(canvasView),
		canvasFilePath,
	};
}

export async function readActiveCanvasFileText(app: App): Promise<string | undefined> {
	const activeFile = app.workspace.getActiveFile();

	if (activeFile?.extension !== "canvas") {
		return undefined;
	}

	return app.vault.cachedRead(activeFile);
}

export async function readCanvasFileTextByPath(app: App, canvasFilePath?: string): Promise<string | undefined> {
	if (!canvasFilePath) {
		return undefined;
	}

	const canvasFile = app.vault.getFileByPath(canvasFilePath);

	if (canvasFile?.extension !== "canvas") {
		return undefined;
	}

	return app.vault.cachedRead(canvasFile);
}
