import { IMessageRepository } from '../../../domain/repositories/inbox/IMessageRepository';
import { UserId } from '../../../domain/value-object/users/UserId';
import { MessageDTO } from '../../../domain/entities/inbox/Message';

export class ListSystemMessagesUseCase {
    constructor(private messageRepository: IMessageRepository) {}

    async execute(): Promise<MessageDTO[]> {
        console.log(`ListSystemMessagesUseCase: Start execution. Target SenderID: ${UserId.SYSTEM_ID.getValue()}`);
        const messages = await this.messageRepository.findBySenderId(UserId.SYSTEM_ID.getValue());
        console.log(`ListSystemMessagesUseCase: Retrieved ${messages.count()} messages.`);
        return messages.getAll().map((message) => message.toDTO());
    }
}
