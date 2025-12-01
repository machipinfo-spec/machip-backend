import { Reaction } from '../../../domain/entities/timeline/reaction';
import { IReactionRepository } from '../../../domain/repositories/timeline/IReactionRepository';
import { ThreadId } from '../../../domain/value-object/timeline/threadId';
import { ResponseId } from '../../../domain/value-object/timeline/responseId';
import { UserId } from '../../../domain/value-object/users/UserId';
import { ReactionType } from '../../../domain/value-object/timeline/reactionType';

export class ReactionCreateUseCase {
    constructor(private reactionRepository: IReactionRepository) {}

    async execute(
        parentId: string,
        ownerUserId: string,
        reactionType: string,
        isThreadParent: boolean = true
    ): Promise<Reaction> {
        // parentIdがThreadIdかResponseIdかを判定
        const parent = isThreadParent 
            ? ThreadId.fromExisting(parentId)
            : ResponseId.fromExisting(parentId);

        const reaction = Reaction.create(
            parent,
            UserId.fromExisting(ownerUserId),
            ReactionType.create(reactionType)
        );

        await this.reactionRepository.save(reaction);
        return reaction;
    }
}