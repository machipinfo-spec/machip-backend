import { Response } from '../../../domain/entities/timeline/response';
import { IResponseRepository } from '../../../domain/repositories/timeline/IResponseRepository';
import { ThreadId } from '../../../domain/value-object/timeline/threadId';
import { ResponseId } from '../../../domain/value-object/timeline/responseId';
import { UserId } from '../../../domain/value-object/users/UserId';
import { ResponseText } from '../../../domain/value-object/timeline/responseText';

export class ResponseCreateUseCase {
    constructor(private responseRepository: IResponseRepository) {}

    async execute(
        parentId: string,
        ownerUserId: string,
        responseText: string,
        isThreadParent: boolean = true
    ): Promise<Response> {
        // parentIdがThreadIdかResponseIdかを判定
        const parent = isThreadParent 
            ? ThreadId.fromExisting(parentId)
            : ResponseId.fromExisting(parentId);

        const response = Response.create(
            parent,
            UserId.fromExisting(ownerUserId),
            ResponseText.create(responseText)
        );

        await this.responseRepository.save(response);
        return response;
    }
}