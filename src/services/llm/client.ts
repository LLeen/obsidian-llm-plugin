import {requestUrl} from "obsidian";
import type {LlmRequestOptions, LlmResponse} from "./types";

type ZhipuMessage = {
	content?: unknown;
	reasoning_content?: unknown;
};

type ZhipuChatCompletionResponse = {
	choices?: unknown;
};

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === "object" && value !== null;
}

function parseLlmResponseBody(responseText: string): ZhipuChatCompletionResponse {
	if (responseText.trim().length === 0) {
		throw new Error("LLM returned an empty response body");
	}

	try {
		const parsed = JSON.parse(responseText) as unknown;

		if (!isRecord(parsed)) {
			throw new Error("LLM returned an unexpected JSON response");
		}

		return parsed;
	} catch (error) {
		if (error instanceof SyntaxError) {
			throw new Error("LLM returned malformed JSON response");
		}

		throw error;
	}
}

function extractTextFromContentPart(part: unknown): string {
	if (!isRecord(part)) {
		return "";
	}

	return typeof part.text === "string" ? part.text : "";
}

function extractTextFromContent(content: unknown): string {
	if (typeof content === "string") {
		return content;
	}

	if (Array.isArray(content)) {
		return content.map(extractTextFromContentPart).join("");
	}

	return "";
}

function readChoiceMessage(choice: unknown): ZhipuMessage | null {
	if (!isRecord(choice) || !isRecord(choice.message)) {
		return null;
	}

	return choice.message;
}

function extractTextFromMessage(message: ZhipuMessage): string {
	const contentText = extractTextFromContent(message.content);

	if (contentText.trim().length > 0) {
		return contentText;
	}

	return typeof message.reasoning_content === "string" ? message.reasoning_content : "";
}

function extractReadableText(data: ZhipuChatCompletionResponse): string {
	if (!Array.isArray(data.choices)) {
		return "";
	}

	for (const choice of data.choices) {
		const message = readChoiceMessage(choice);

		if (!message) {
			continue;
		}

		const text = extractTextFromMessage(message);

		if (text.trim().length > 0) {
			return text;
		}
	}

	return "";
}

export async function callLlmApi(options: LlmRequestOptions): Promise<LlmResponse> {
	const response = await requestUrl({
		url: options.baseUrl,
		method: "POST",
		headers: {
			"Content-Type": "application/json",
			"Authorization": `Bearer ${options.apiKey}`,
		},
		body: JSON.stringify({
			model: options.model,
			messages: options.messages,
			temperature: options.temperature,
			max_tokens: options.maxTokens,
			stream: false,
		}),
	});

	const responseText = response.text;

	if (response.status < 200 || response.status >= 300) {
		throw new Error(`LLM API request failed: ${response.status} ${responseText}`);
	}

	const data = parseLlmResponseBody(responseText);
	const text = extractReadableText(data);

	if (text.trim() === "") {
		console.debug("Raw LLM response:", data);
		throw new Error("LLM returned no readable text content");
	}

	return {
		text,
		raw: data,
	};
}
