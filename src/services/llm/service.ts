import {callLlmApi} from "./client";
import {DEFAULT_SYSTEM_PROMPT} from "./prompts";
import {ChatMessage, LlmResponse} from "./types";

export type GenerateAnswerParams = {
apiKey: string;
baseUrl: string;
model: string;
temperature: number;
maxTokens?: number;
userInput: string;
contextText: string;
systemPrompt?: string;
};

export async function generateAnswer(params: GenerateAnswerParams): Promise<LlmResponse> {
	const messages: ChatMessage[] = [
		{
			role: "system",
			content: params.systemPrompt?.trim() || DEFAULT_SYSTEM_PROMPT,
		},
		{
			role: "user",
			content: [
				"Context:",
				params.contextText,
				"",
				"Question:",
				params.userInput,
			].join("\n"),
		},
	];

	return await callLlmApi({
		apiKey: params.apiKey,
		baseUrl: params.baseUrl,
		model: params.model,
		temperature: params.temperature,
		maxTokens: params.maxTokens,
		messages,
	});
}
