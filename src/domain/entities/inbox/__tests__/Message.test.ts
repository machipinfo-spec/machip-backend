jest.mock('uuid', () => ({
    v4: () => '12345678-1234-4000-8000-123456789012',
}));

import { Message } from '../Message';
import { MessageId } from '../../../value-object/inbox/MessageId';
import { MessageType } from '../../../value-object/inbox/MessageType';
import { MessageSubject } from '../../../value-object/inbox/MessageSubject';
import { SystemMessageContent } from '../../../value-object/inbox/SystemMessageContent';
import { UserId } from '../../../value-object/users/UserId';
import { CreatedAt } from '../../../value-object/inbox/CreatedAt';
import { ReadStatus } from '../../../value-object/inbox/ReadStatus';

describe('Message Entity', () => {
    describe('create', () => {
        it('should create a new Message', () => {
            const type = MessageType.system();
            const subject = MessageSubject.create('Test Subject');
            const content = SystemMessageContent.create('Test Content');
            const senderUserId = new UserId('12345678-1234-4000-8000-123456789012');

            const message = Message.create(type, subject, content, senderUserId);
            // ...
            expect(message).toBeInstanceOf(Message);
            expect(message.getId().getValue()).toBe('12345678-1234-4000-8000-123456789012');
            expect(message.getType().equals(type)).toBe(true);
            expect(message.getSubject().equals(subject)).toBe(true);
            expect(message.getContent()).toBe(content);
            expect(message.getSenderUserId().equals(senderUserId)).toBe(true);
            expect(message.getReadStatus().isUnread()).toBe(true);
        });
    });

    describe('createSystemMessage', () => {
        it('should create a system message with default sender', () => {
            const subject = 'System Alert';
            const content = 'Maintenance Mode';

            const message = Message.createSystemMessage(subject, content);

            expect(message.getType().isSystem()).toBe(true);
            expect(message.getSubject().getValue()).toBe(subject);
            expect((message.getContent() as SystemMessageContent).getMessage()).toBe(content);
        });
    });

    describe('markAsRead', () => {
        it('should mark message as read', () => {
            const message = Message.create(
                MessageType.system(),
                MessageSubject.create('Test'),
                SystemMessageContent.create('Test'),
                new UserId('12345678-1234-4000-8000-123456789012'),
            );

            expect(message.isUnread()).toBe(true);

            message.markAsRead();

            expect(message.isRead()).toBe(true);
        });
    });

    describe('DTO Conversion', () => {
        it('should convert to DTO and back', () => {
            const message = Message.create(
                MessageType.system(),
                MessageSubject.create('DTO Test'),
                SystemMessageContent.create('Content'),
                new UserId('12345678-1234-4000-8000-123456789012'),
            );

            const dto = message.toDTO();
            const reconstructed = Message.fromDTO(dto);

            expect(reconstructed.getId().equals(message.getId())).toBe(true);
            expect(reconstructed.getSubject().getValue()).toBe(message.getSubject().getValue());
            expect((reconstructed.getContent() as SystemMessageContent).getMessage()).toBe(
                (message.getContent() as SystemMessageContent).getMessage(),
            );
        });

        it('should handle legacy string content for system messages', () => {
            const legacyDto = {
                messageId: '12345678-1234-4000-8000-123456789012',
                type: 'system',
                subject: 'Legacy',
                content: 'Plain String Content',
                senderUserId: '12345678-1234-4000-8000-123456789012',
                createdAt: new Date().toISOString(),
                isRead: false,
            };

            const message = Message.fromDTO(legacyDto);

            expect(message.getContent()).toBeInstanceOf(SystemMessageContent);
            expect((message.getContent() as SystemMessageContent).getMessage()).toBe('Plain String Content');
        });
    });
});
