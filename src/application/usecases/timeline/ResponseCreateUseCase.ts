import { Response } from '../../../domain/entities/timeline/response';
import { IResponseRepository } from '../../../domain/repositories/timeline/IResponseRepository';
import { ThreadId } from '../../../domain/value-object/timeline/threadId';
import { ResponseId } from '../../../domain/value-object/timeline/responseId';
import { UserId } from '../../../domain/value-object/users/UserId';
import { ResponseText } from '../../../domain/value-object/timeline/responseText';
import { IContentModerationQueue } from '../../../domain/repositories/queue/IContentModerationQueue';

export class ResponseCreateUseCase {
    constructor(
        private responseRepository: IResponseRepository,
        private contentModerationQueue: IContentModerationQueue,
    ) {}

    async execute(
        parentId: string,
        ownerUserId: string,
        responseText: string,
        isThreadParent: boolean = true,
    ): Promise<Response> {
        // parentIdがThreadIdかResponseIdかを判定
        const parent = isThreadParent ? ThreadId.fromExisting(parentId) : ResponseId.fromExisting(parentId);

        const response = Response.create(parent, UserId.fromExisting(ownerUserId), ResponseText.create(responseText));

        await this.responseRepository.save(response);

        // Send to moderation queue
        try {
            const primitives = response.toPrimitives();
            await this.contentModerationQueue.sendMessage({
                targetType: 'response',
                targetId: primitives.id,
                ownerUserId: ownerUserId,
                content: responseText,
                imageUrls: [],
            });
        } catch (e) {
            console.error('ResponseCreateUseCase: Failed to send to moderation queue', e);
        }

        return response;
    }
}
