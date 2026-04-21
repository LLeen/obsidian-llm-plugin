import {App, ItemView} from "obsidian";
import type {CanvasNodeLike} from "../canvasTypes";

type ActiveCanvasSelectionResult =
	| {status: "not-canvas"}
	| {status: "missing-canvas"}
	| {status: "ok"; selection: CanvasNodeLike[]};

interface CanvasViewLike extends ItemView {
	canvas?: {
		selection?: Set<CanvasNodeLike>;
	};
}

export function getActiveCanvasSelection(app: App): ActiveCanvasSelectionResult {
	const view = app.workspace.getActiveViewOfType(ItemView);

	if (!view || view.getViewType() !== "canvas") {
		return {status: "not-canvas"};
	}

	const canvasView = view as CanvasViewLike;

	if (!canvasView.canvas) {
		return {status: "missing-canvas"};
	}

	return {
		status: "ok",
		selection: Array.from(canvasView.canvas.selection ?? []),
	};
}

export async function readActiveCanvasFileText(app: App): Promise<string | undefined> {
	const activeFile = app.workspace.getActiveFile();

	if (activeFile?.extension !== "canvas") {
		return undefined;
	}

	return app.vault.cachedRead(activeFile);
}
