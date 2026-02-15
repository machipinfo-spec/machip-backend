import { AiRequest } from '../../domain/repositories/ai/IAiRepository';
import { DeepSeek } from './DeepSeekTypes';

export interface ExtendedAiRequest extends AiRequest {
    messages?: DeepSeek.Message[]; // Add direct message support
    systemPrompt?: string;
    options?: {
        temperature?: number;
        maxTokens?: number;
        topP?: number;
        frequencyPenalty?: number;
        presencePenalty?: number;
        responseFormat?: { type: 'json_object' | 'text' };
    };
}

// DeepSeek用のシステムプロンプトを含むリクエストに変換する関数
export function createDeepSeekMessages(request: ExtendedAiRequest): DeepSeek.Message[] {
    if (request.messages && request.messages.length > 0) {
        return request.messages;
    }
    const messages: DeepSeek.Message[] = [];

    if (request.systemPrompt) {
        messages.push({
            role: 'system',
            content: request.systemPrompt,
        });
    }

    messages.push({
        role: 'user',
        content: request.prompt,
    });

    return messages;
}
