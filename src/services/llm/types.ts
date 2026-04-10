export type ChatRole = "system" | "user" | "assistant";

export type ChatMessage = {
role: ChatRole;
content: string;
};

export type LlmRequestOptions = {
apiKey: string;
baseUrl: string;
model: string;
temperature: number;
maxTokens?: number;
messages: ChatMessage[];
};

export type LlmResponse = {
text: string;
raw?: unknown;
};
