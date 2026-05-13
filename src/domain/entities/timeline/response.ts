import { ThreadId } from '../../value-object/timeline/threadId';
import { UserId } from '../../value-object/users/UserId';
import { ResponseId } from '../../value-object/timeline/responseId';
import { ResponseText } from '../../value-object/timeline/responseText';

export class Response {
    private constructor(
        private readonly id: ResponseId,
        private readonly parentId: ThreadId | ResponseId,
        private readonly createdAt: Date,
        private readonly deleatedAt: Date | null,
        private readonly ownerUserId: UserId,
        private readonly responseText: ResponseText,
    ) {
        Object.freeze(this);
    }

    public static create(parentId: ThreadId | ResponseId, ownerUserId: UserId, responseText: ResponseText): Response {
        return new Response(ResponseId.create(), parentId, new Date(), null, ownerUserId, responseText);
    }

    public static fromExisting(
        id: ResponseId,
        parentId: ThreadId | ResponseId,
        createdAt: Date,
        deleatedAt: Date | null,
        ownerUserId: UserId,
        responseText: ResponseText,
    ): Response {
        return new Response(id, parentId, createdAt, deleatedAt, ownerUserId, responseText);
    }

    public delete(): Response {
        return new Response(this.id, this.parentId, this.createdAt, new Date(), this.ownerUserId, this.responseText);
    }

    public toPrimitives(): ResponseDTO {
        return {
            id: this.id.getValue(),
            parentId: this.parentId.getValue(),
            createdAt: this.createdAt,
            deleatedAt: this.deleatedAt,
            ownerUserId: this.ownerUserId.getValue(),
            responseText: this.responseText.getValue(),
        };
    }
}

export interface ResponseDTO {
    id: string;
    parentId: string;
    createdAt: Date;
    deleatedAt: Date | null;
    ownerUserId: string;
    responseText: string;
}
