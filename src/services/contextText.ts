const EXCERPT_SEPARATOR = "\n...\n";

export function normalizeTextForContext(text: string): string {
	return text
		.replace(/\r\n?/g, "\n")
		.split("\n")
		.map((line) => line.replace(/[ \t]+/g, " ").trim())
		.join("\n")
		.replace(/\n{3,}/g, "\n\n")
		.trim();
}

export function compressTextForContext(text: string, maxChars: number): string | undefined {
	if (maxChars <= 0) {
		return undefined;
	}

	const normalized = normalizeTextForContext(text);

	if (normalized.length === 0) {
		return undefined;
	}

	if (normalized.length <= maxChars) {
		return normalized;
	}

	if (maxChars <= EXCERPT_SEPARATOR.length + 8) {
		return normalized.slice(0, maxChars).trim();
	}

	const remainingChars = maxChars - EXCERPT_SEPARATOR.length;
	const headChars = Math.max(1, Math.ceil(remainingChars * 0.7));
	const tailChars = Math.max(1, remainingChars - headChars);

	return [
		normalized.slice(0, headChars).trim(),
		EXCERPT_SEPARATOR.trim(),
		normalized.slice(normalized.length - tailChars).trim(),
	].join("\n");
}
