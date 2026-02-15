import { ContentModerationRequest } from '../../../domain/repositories/queue/IContentModerationQueue';
import { IContentModerationHistoryRepository } from '../../../domain/repositories/timeline/IContentModerationHistoryRepository';
import { IThreadRepository } from '../../../domain/repositories/timeline/IThreadRepository';
import { IResponseRepository } from '../../../domain/repositories/timeline/IResponseRepository';
import { EnhancedDeepSeekApiRepository } from '../../../infrastructure/deep-seek/EnhancedDeepSeekApiRepository';
import { ContentModerationHistory } from '../../../domain/entities/timeline/contentModerationHistory';

export class ContentModerationService {
    constructor(
        private readonly moderationHistoryRepository: IContentModerationHistoryRepository,
        private readonly threadRepository: IThreadRepository,
        private readonly responseRepository: IResponseRepository,
        private readonly aiRepository: EnhancedDeepSeekApiRepository,
    ) {}

    async execute(request: ContentModerationRequest): Promise<void> {
        console.log('ContentModerationService: execute called', request);

        // 1. Call ID Check
        const result = await this.aiRepository.checkModeration(request.content, request.imageUrls);
        console.log('ContentModerationService: AI result', result);

        // 2. Save History
        const history = ContentModerationHistory.create(
            request.targetId,
            request.content,
            result.isViolation,
            result.reason,
            result.aiResponse,
        );
        await this.moderationHistoryRepository.save(history);

        // 3. Action if violation
        if (result.isViolation) {
            console.log('ContentModerationService: Violation detected, deleting content', {
                targetId: request.targetId,
                type: request.targetType,
            });
            if (request.targetType === 'thread') {
                await this.threadRepository.softDelete(request.targetId);
            } else if (request.targetType === 'response') {
                await this.responseRepository.delete(request.targetId);
            }
        }
    }
}
