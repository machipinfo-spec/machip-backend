import { ThreadId } from '../../value-object/timeline/threadId';
import { UserId } from '../../value-object/users/UserId';
import { ResponseId } from '../../value-object/timeline/responseId';
import { ReactionsId } from '../../value-object/timeline/reactionId';
import { ReactionType } from '../../value-object/timeline/reactionType';

export class Reaction {
    private constructor(
        private readonly id: ReactionsId,
        private readonly reactionsType: ReactionType,
        private readonly parentId: ThreadId | ResponseId,
        private readonly createdAt: Date,
        private readonly deleatedAt: Date | null,
        private readonly ownerUserId: UserId,
    ) {
        Object.freeze(this);
    }

    public static create(
        parentId: ThreadId | ResponseId,
        ownerUserId: UserId,
        reactionsType: ReactionType,
    ): Reaction {
        return new Reaction(
            ReactionsId.create(),
            reactionsType,
            parentId,
            new Date(),
            null,
            ownerUserId,
        );
    }

    public static fromExisting(
        id: ReactionsId,
        reactionsType: ReactionType,
        parentId: ThreadId | ResponseId,
        createdAt: Date,
        deleatedAt: Date | null,
        ownerUserId: UserId,
    ): Reaction {
        return new Reaction(id, reactionsType, parentId, createdAt, deleatedAt, ownerUserId);
    }

    public toPrimitives(): ReactionDTO {
        return {
            id: this.id.getValue(),
            reactionsType: this.reactionsType.getValue(),
            parentId: this.parentId.getValue(),
            createdAt: this.createdAt,
            deleatedAt: this.deleatedAt,
            ownerUserId: this.ownerUserId.getValue(),
        };
    }
}

export interface ReactionDTO {
    id: string;
    reactionsType: string;
    parentId: string;
    createdAt: Date;
    deleatedAt: Date | null;
    ownerUserId: string;
}