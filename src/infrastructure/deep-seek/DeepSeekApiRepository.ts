import { AiRequest, AiResponse, IAiRepository } from '../../domain/repositories/ai/IAiRepository';
import axios from 'axios';
import { ParameterStoreManager } from '../utils/parameterStoreManager';
import { DeepSeek } from './DeepSeekTypes';

export class DeepSeekApiRepository implements IAiRepository {
    private apiKey: string;
    private apiEndpoint: string;

    constructor() {
        this.apiKey = process.env.DEEPSEEK_API_KEY || '';
        this.apiEndpoint = 'https://api.deepseek.com/v1/chat/completions';
    }

    async initialize() {
        // get api key from parameter store
        const region = process.env.AWS_REGION || 'ap-northeast-1';
        const parameterStoreManager = new ParameterStoreManager(region);
        this.apiKey = await parameterStoreManager.getParameter('/posifit/deepseek/apikey');
        if (!this.apiKey) {
            throw new Error('API key is not set');
        }
    }

    async request(request: AiRequest): Promise<AiResponse> {
        if (!this.apiKey) {
            await this.initialize();
        }
        if (!this.apiKey) {
            throw new Error('API key is not initialized');
        }

        try {
            const requestData: DeepSeek.CompletionRequest = {
                model: 'deepseek-chat', // DeepSeekのデフォルトモデル、必要に応じて変更可能
                messages: [
                    {
                        role: 'user',
                        content: request.prompt,
                    },
                ],
                max_tokens: 2000,
                temperature: 0.7, // 柔軟性を保つためのデフォルト値
                top_p: 0.95, // 出力の多様性を確保
                frequency_penalty: 0.0, // 繰り返しを抑制する度合い
                presence_penalty: 0.0, // 新しいトピックの導入を促進する度合い
            };

            const response = await axios.post<DeepSeek.CompletionResponse>(this.apiEndpoint, requestData, {
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${this.apiKey}`,
                },
            });

            // DeepSeekのレスポンス形式に合わせて結果を抽出
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
}
