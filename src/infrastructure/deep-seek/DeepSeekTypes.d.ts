export namespace DeepSeek {
    export interface Message {
        role: 'system' | 'user' | 'assistant';
        content: string;
    }

    export interface CompletionRequest {
        model: string;
        messages: Message[];
        max_tokens?: number;
        temperature?: number;
        top_p?: number;
        frequency_penalty?: number;
        presence_penalty?: number;
        stop?: string[];
        stream?: boolean;
        response_format?: { type: 'json_object' | 'text' };
    }

    export interface Choice {
        index: number;
        message: {
            role: string;
            content: string;
        };
        finish_reason: string;
    }

    export interface Usage {
        prompt_tokens: number;
        completion_tokens: number;
        total_tokens: number;
    }

    export interface CompletionResponse {
        id: string;
        object: string;
        created: number;
        model: string;
        choices: Choice[];
        usage: Usage;
    }
}
