import { IReactionRepository } from '../../../domain/repositories/timeline/IReactionRepository';

export class ReactionDeleteUseCase {
    constructor(private reactionRepository: IReactionRepository) {}

    /**
     * リアクションを削除
     */
    async execute(reactionId: string): Promise<void> {
        const reaction = await this.reactionRepository.findById(reactionId);

        if (!reaction) {
            throw new Error(`Reaction not found: ${reactionId}`);
        }

        await this.reactionRepository.delete(reactionId);
    }

    /**
     * リアクションを論理削除（deleatedAtを設定）
     */
    async executeSoftDelete(reactionId: string): Promise<void> {
        const reaction = await this.reactionRepository.findById(reactionId);

        if (!reaction) {
            throw new Error(`Reaction not found: ${reactionId}`);
        }

        await this.reactionRepository.softDelete(reactionId);
    }
}