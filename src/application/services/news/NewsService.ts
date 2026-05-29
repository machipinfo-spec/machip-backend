import { EnhancedDeepSeekApiRepository } from '../../../infrastructure/deep-seek/EnhancedDeepSeekApiRepository';
import { ExtendedAiRequest } from '../../../infrastructure/deep-seek/ExtendedAiRequest';
import { NewsItem } from '../../../domain/entities/news/news';
import { ThreadCreateUseCase } from '../../usecases/timeline/ThreadCreateUseCase';
import { UserId } from '../../../domain/value-object/users/UserId';

export class NewsService {
    constructor(
        private readonly aiRepository: EnhancedDeepSeekApiRepository,
        private readonly threadCreateUseCase: ThreadCreateUseCase,
    ) {}

    async fetchAndPostNews(region: string): Promise<number> {
        console.log(`NewsService: fetching news for region: ${region}`);

        const systemPrompt = `
あなたは優秀なニュースキュレーターです。
以下の地域の最新ニュース（政治、経済、文化、気象など）を5件検索・抽出し、指定のJSON形式で出力してください。
地域: ${region}

結果は必ず以下のJSON配列形式で返してください：
{
  "news": [
    {
      "title": "ニュースのタイトル",
      "body": "ニュースの詳細な本文（200文字程度）",
      "imageUrl": "関連する画像URL。ない場合はnullを指定してください"
    }
  ]
}
JSON以外の文章は一切含めないでください。
`;

        const request: ExtendedAiRequest = {
            prompt: '', // system prompt provides the main instruction
            messages: [
                { role: 'system', content: systemPrompt },
                { role: 'user', content: `${region}の最新ニュースを5件教えてください。` },
            ],
            options: {
                temperature: 0.2, // Low temperature for more factual/consistent response
                responseFormat: { type: 'json_object' },
            },
        };

        const response = await this.aiRepository.request(request);
        const text = response.result;

        let newsItems: NewsItem[] = [];

        try {
            const jsonText = text.replace(/```json\n|\n```/g, '').trim();
            const json = JSON.parse(jsonText);

            if (json.news && Array.isArray(json.news)) {
                newsItems = json.news;
            } else {
                throw new Error('Invalid JSON structure: "news" array not found');
            }
        } catch (error) {
            console.error('NewsService: Failed to parse AI response', text, error);
            throw new Error('AIから返却されたデータの解析に失敗しました。');
        }

        if (newsItems.length === 0) {
            return 0;
        }

        console.log(`NewsService: Fetched ${newsItems.length} news items. Posting to timeline...`);

        const systemUserId = UserId.AI_BOT.getValue();
        let postedCount = 0;

        for (const item of newsItems) {
            // スレッドのテキスト（threadName）は、タイトルと本文を結合した形にする
            const threadContent = `【ニュース】${item.title}\n\n${item.body}`;

            try {
                await this.threadCreateUseCase.execute(
                    threadContent,
                    systemUserId,
                    null, // pointInfoId
                    item.imageUrl || null,
                    null, // parentThreadId
                );
                postedCount++;
            } catch (error) {
                console.error('NewsService: Failed to post news to timeline', error, item);
                // 1件失敗しても他のニュースの投稿は続ける
            }
        }

        return postedCount;
    }
}
