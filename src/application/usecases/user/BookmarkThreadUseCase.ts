import { IBookmarkRepository } from '../../../domain/repositories/user/IBookmarkRepository';
import { UserId } from '../../../domain/value-object/users/UserId';
import { ThreadId } from '../../../domain/value-object/timeline/threadId';

export class BookmarkThreadUseCase {
    constructor(private bookmarkRepository: IBookmarkRepository) {}

    async execute(userId: string, threadId: string): Promise<void> {
        await this.bookmarkRepository.save(
            UserId.fromExisting(userId),
            ThreadId.fromExisting(threadId)
        );
    }
}
