// ドメインレイヤーのIAiRepositoryインターフェイスの拡張案
export interface AiRequest {
    prompt: string;
}

export interface ExtendedAiRequest extends AiRequest {
    systemPrompt?: string;
    options?: {
        temperature?: number;
        maxTokens?: number;
        topP?: number;
        frequencyPenalty?: number;
        presencePenalty?: number;
    };
}

export interface AiResponse {
    result: string;
}

export interface IAiRepository {
    initialize(): Promise<void>;
    request(request: AiRequest | ExtendedAiRequest): Promise<AiResponse>;
}
