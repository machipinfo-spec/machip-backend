import { DynamoDBDocumentClient, PutCommand, GetCommand, ScanCommand } from '@aws-sdk/lib-dynamodb';
import { mockClient } from 'aws-sdk-client-mock';
import { DynamoMessageRepository } from '../DynamoMessageRepository';
import { Message } from '../../../../../domain/entities/inbox/Message';
import { MessageType } from '../../../../../domain/value-object/inbox/MessageType';
import { MessageSubject } from '../../../../../domain/value-object/inbox/MessageSubject';
import { SystemMessageContent } from '../../../../../domain/value-object/inbox/SystemMessageContent';
import { UserId } from '../../../../../domain/value-object/users/UserId';
import { MessageId } from '../../../../../domain/value-object/inbox/MessageId';

const ddbMock = mockClient(DynamoDBDocumentClient);

describe('DynamoMessageRepository', () => {
    let repository: DynamoMessageRepository;

    beforeEach(() => {
        ddbMock.reset();
        repository = new DynamoMessageRepository();
    });

    test('save should put item', async () => {
        const message = Message.create(
            MessageType.system(),
            MessageSubject.create('Subj'),
            SystemMessageContent.create('Body'),
            UserId.create(),
        );

        ddbMock.on(PutCommand).resolves({});

        await repository.save(message);

        expect(ddbMock.calls()).toHaveLength(1);
        const input = ddbMock.call(0).args[0] as any;
        expect(input.input.TableName).toBe('Messages');
        expect(input.input.Item.id).toBe(message.getId().getValue());
    });

    test('findById should return message properly', async () => {
        const id = '123e4567-e89b-42d3-a456-426614174000'; // Valid UUID v4
        const senderId = '123e4567-e89b-42d3-a456-426614174001'; // Valid UUID v4
        const mockItem = {
            id: id,
            messageId: id,
            type: 'system',
            subject: 'Subj',
            content: JSON.stringify({ message: 'Body' }),
            senderUserId: senderId,
            createdAt: new Date().toISOString(),
            isRead: false,
        };

        ddbMock.on(GetCommand).resolves({ Item: mockItem });

        const result = await repository.findById(MessageId.fromExisting(id));

        expect(result).not.toBeNull();
        expect(result?.getId().getValue()).toBe(id);
        expect(result?.getType().getValue()).toBe('system');
        expect(result?.getContent().toJSON()).toEqual(JSON.stringify({ message: 'Body' }));
        expect(result?.getSenderUserId().getValue()).toBe(senderId);
        expect(result?.isRead()).toBe(false);
    });

    test('findAll should return collection', async () => {
        const mockItem = {
            id: '123e4567-e89b-42d3-a456-426614174000',
            messageId: '123e4567-e89b-42d3-a456-426614174000',
            type: 'system',
            subject: 'Subj',
            content: JSON.stringify({ message: 'Body' }),
            senderUserId: '123e4567-e89b-42d3-a456-426614174001',
            createdAt: new Date().toISOString(),
            isRead: false,
        };

        ddbMock.on(ScanCommand).resolves({ Items: [mockItem] });

        const result = await repository.findAll();
        expect(result.count()).toBe(1);
    });
});
