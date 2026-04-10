import {LlmRequestOptions, LlmResponse} from "./types";
import { requestUrl } from "obsidian";

type ZhipuMessageContentPart = {
text?: string;
};

type ZhipuChatCompletionResponse = {
id?: string;
choices?: Array<{
index?: number;
message?: {
role?: string;
content?: string | ZhipuMessageContentPart[];
reasoning_content?: string;
};
finish_reason?: string;
}>;
usage?: {
prompt_tokens?: number;
completion_tokens?: number;
total_tokens?: number;
};
};

export async function callLlmApi(options: LlmRequestOptions): Promise<LlmResponse> {
	const response = await fetch(options.baseUrl, {
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

	if (!response.ok) {
		const errorText = await response.text();
		throw new Error(`LLM API request failed: ${response.status} ${errorText}`);
	}
const data = (await response.json()) as ZhipuChatCompletionResponse;
const message = data.choices?.[0]?.message;
const content = message?.content;
const reasoning = message?.reasoning_content;
	let text = "";

if (typeof content === "string" && content.trim() !== "") {
	text = content;
} else if (Array.isArray(content)) {
	text = content
		.map((part: ZhipuMessageContentPart): string => {
			if (typeof part.text === "string") return part.text;
			return "";
		})
		.join("");
} else if (typeof reasoning === "string" && reasoning.trim() !== "") {
	text = reasoning;
}

if (text.trim() === "") {
	console.debug("Raw LLM response:", data);
	throw new Error("LLM returned no readable text content");
}

	return {
		text,
		raw: data,
	};
}
