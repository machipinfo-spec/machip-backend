import { IMessageRepository } from '../../../domain/repositories/inbox/IMessageRepository';
import { MessageId } from '../../../domain/value-object/inbox/MessageId';

export class DeleteSystemMessageUseCase {
    constructor(private messageRepository: IMessageRepository) {}

    async execute(messageId: string): Promise<void> {
        await this.messageRepository.delete(MessageId.fromExisting(messageId));
    }
}
