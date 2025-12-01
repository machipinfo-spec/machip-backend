import { Reaction } from '../../entities/timeline/reaction';

export interface IReactionRepository {
    save(reaction: Reaction): Promise<void>;
    findById(reactionsId: string): Promise<Reaction | null>;
    findByParentId(parentId: string, limit?: number): Promise<Reaction[]>;
    // findByOwnerUserId(ownerUserId: string, limit?: number): Promise<Reaction[]>;
    delete(reactionId: string): Promise<void>;
    softDelete(reactionId: string): Promise<void>;
}