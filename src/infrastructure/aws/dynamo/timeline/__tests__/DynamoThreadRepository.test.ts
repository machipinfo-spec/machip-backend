import { DynamoDBDocumentClient, PutCommand, GetCommand, QueryCommand } from '@aws-sdk/lib-dynamodb';
import { mockClient } from 'aws-sdk-client-mock';
import { DynamoThreadRepository } from '../DynamoThreadRepository';
import { Thread } from '../../../../../domain/entities/timeline/thread';
import { ThreadName } from '../../../../../domain/value-object/map/threadName';
import { UserId } from '../../../../../domain/value-object/users/UserId';

const ddbMock = mockClient(DynamoDBDocumentClient);

describe('DynamoThreadRepository', () => {
    let repository: DynamoThreadRepository;

    beforeEach(() => {
        ddbMock.reset();
        repository = new DynamoThreadRepository();
    });

    test('save should put item', async () => {
        const thread = Thread.create(new ThreadName('Test Thread'), UserId.create(), null, null, null);

        ddbMock.on(PutCommand).resolves({});

        await repository.save(thread);

        expect(ddbMock.calls()).toHaveLength(1);
        const input = ddbMock.call(0).args[0] as any;
        expect(input.input.TableName).toBe('Threads');
        expect(input.input.Item.id).toBe(thread.getThreadId().getValue());
    });

    test('findById should return thread', async () => {
        const id = '123e4567-e89b-42d3-a456-426614174005';
        const uid = '123e4567-e89b-42d3-a456-426614174006';
        const mockItem = {
            id: id,
            threadName: 'Test Thread',
            createdAt: new Date().toISOString(),
            deleatedAt: null,
            ownerUserId: uid,
            parentThreadId: null,
            childThreadIds: [],
            mapPointInfoId: null,
            imageUrl: null,
        };

        ddbMock.on(GetCommand).resolves({
            Item: mockItem,
        });

        const result = await repository.findById(id);

        expect(result).not.toBeNull();
        expect(result?.getThreadId().getValue()).toBe(id);
    });

    test('findByOwnerUserId should return threads', async () => {
        const uid = '123e4567-e89b-42d3-a456-426614174006';
        const id = '123e4567-e89b-42d3-a456-426614174005';
        const mockItem = {
            id: id,
            threadName: 'Test Thread',
            createdAt: new Date().toISOString(),
            deleatedAt: null,
            ownerUserId: uid,
            parentThreadId: null,
            childThreadIds: [],
            mapPointInfoId: null,
            imageUrl: null,
        };

        ddbMock.on(QueryCommand).resolves({
            Items: [mockItem],
        });

        const result = await repository.findByOwnerUserId(uid);

        expect(result).toHaveLength(1);
        expect(result[0].getOwnerUserId().getValue()).toBe(uid);
    });
});
