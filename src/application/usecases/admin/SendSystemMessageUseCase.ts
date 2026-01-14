import {
    MessageSendingService,
    MessageSendingRequest,
    MessageSendingResult,
} from '../../services/inbox/MessageSendingService';

export interface AdminMessageRequest {
    targetUserIds: string[] | 'all';
    subject: string;
    content: string;
}

import { UserId } from '../../../domain/value-object/users/UserId';

export class SendSystemMessageUseCase {
    constructor(private messageSendingService: MessageSendingService) {}

    async execute(props: AdminMessageRequest): Promise<MessageSendingResult> {
        let request: MessageSendingRequest;

        if (props.targetUserIds === 'all') {
            request = {
                type: 'system',
                subject: props.subject,
                content: { message: props.content },
                senderUserId: UserId.SYSTEM_ID.getValue(),
                deliveryType: 'all',
            };
        } else if (Array.isArray(props.targetUserIds)) {
            request = {
                type: 'system',
                subject: props.subject,
                content: { message: props.content },
                senderUserId: UserId.SYSTEM_ID.getValue(),
                deliveryType: 'multiple',
                targetUserIds: props.targetUserIds,
            };
        } else {
            throw new Error('Invalid targetUserIds format.');
        }

        return this.messageSendingService.sendMessage(request);
    }
}
