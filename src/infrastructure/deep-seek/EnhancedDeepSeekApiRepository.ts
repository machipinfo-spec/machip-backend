import { AiResponse, IAiRepository } from '../../domain/repositories/ai/IAiRepository';
import axios from 'axios';
import { ParameterStoreManager } from '../utils/parameterStoreManager';
import { DeepSeek } from './DeepSeekTypes';
import { ExtendedAiRequest, createDeepSeekMessages } from './ExtendedAiRequest';

export class EnhancedDeepSeekApiRepository implements IAiRepository {
    private apiKey: string;
    private apiEndpoint: string;
    private modelName: string;

    constructor(modelName = 'deepseek-chat') {
        this.apiKey = process.env.DEEPSEEK_API_KEY || '';
        this.apiEndpoint = 'https://api.deepseek.com/v1/chat/completions';
        this.modelName = modelName;
    }

    async initialize() {
        // get api key from parameter store
        const region = process.env.AWS_REGION || 'ap-northeast-1';
        const parameterStoreManager = new ParameterStoreManager(region);
        this.apiKey = await parameterStoreManager.getParameter('/tetra/deepseek/apikey');
        if (!this.apiKey) {
            throw new Error('API key is not set');
        }
    }

    async request(request: ExtendedAiRequest): Promise<AiResponse> {
        if (!this.apiKey) {
            await this.initialize();
        }
        if (!this.apiKey) {
            throw new Error('API key is not initialized');
        }

        try {
            const messages = createDeepSeekMessages(request);

            const requestData: DeepSeek.CompletionRequest = {
                model: this.modelName,
                messages: messages,
                max_tokens: request.options?.maxTokens || 1000,
                temperature: request.options?.temperature || 0.7,
                top_p: request.options?.topP || 0.95,
                frequency_penalty: request.options?.frequencyPenalty || 0.0,
                presence_penalty: request.options?.presencePenalty || 0.0,
                response_format: request.options?.responseFormat,
            };

            const response = await axios.post<DeepSeek.CompletionResponse>(this.apiEndpoint, requestData, {
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${this.apiKey}`,
                },
            });

            // トークン使用量のログ記録（オプション）
            if (response.data.usage) {
                console.log(`DeepSeek API usage: ${response.data.usage.total_tokens} tokens`);
            }

            // レスポンス形式に合わせて結果を抽出
            const textContent = response.data.choices[0]?.message?.content || '';

            return {
                result: textContent,
            };
        } catch (error) {
            console.error('Error calling DeepSeek API:', error);
            throw new Error(
                `Failed to get response from DeepSeek: ${error instanceof Error ? error.message : String(error)}`,
            );
        }
    }
    async checkModeration(
        content: string,
        imageUrls: string[],
    ): Promise<{ isViolation: boolean; reason: string; aiResponse: string }> {
        const systemPrompt = `
あなたはコンテンツモデレーションAIです。
以下のコンテンツを分析し、コミュニティガイドライン（暴力、性的コンテンツ、ハラスメント、ヘイトスピーチなど）に違反していないか判断してください。
画像のURLが提供された場合は、コンテキストの一部として考慮してください（画像自体を見ることはできませんが、潜在的なコンテンツとして扱ってください）。
結果は以下のJSON形式で返してください：
{
  "isViolation": boolean,
  "reason": "string (違反理由を日本語で簡潔に説明してください。ユーザーへの通知に使用します)",
  "category": "string (任意のカテゴリ)"
}
JSONのみを返してください。
`;

        let userContent = content;
        if (imageUrls.length > 0) {
            userContent += `\n\nAttached Images:\n${imageUrls.join('\n')}`;
        }

        const request: ExtendedAiRequest = {
            prompt: '', // Dummy prompt to satisfy AiRequest interface
            messages: [
                { role: 'system', content: systemPrompt },
                { role: 'user', content: userContent },
            ],
            options: {
                temperature: 0.0, // Detailed analysis, less randomness
                responseFormat: { type: 'json_object' }, // If supported by DeepSeek, otherwise rely on prompt
            },
        };

        const response = await this.request(request);
        const text = response.result;

        // Parse JSON
        try {
            // Remove markdown code blocks if present
            const jsonText = text.replace(/```json\n|\n```/g, '').trim();
            const json = JSON.parse(jsonText);
            return {
                isViolation: !!json.isViolation,
                reason: json.reason || 'No reason provided',
                aiResponse: text,
            };
        } catch (e) {
            console.error('Failed to parse moderation response:', text, e);
            // Fail safe: treat as non-violation but log error? Or treat as violation?
            // Usually fail open (safe) for automated systems to avoid false positives blocking users,
            // or fail closed (violation) if safety is paramount.
            // Let's return false but with error reason.
            return {
                isViolation: false,
                reason: 'Failed to parse AI response',
                aiResponse: text,
            };
        }
    }
}
