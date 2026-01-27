import { DynamoDBDocumentClient, PutCommand, QueryCommand } from '@aws-sdk/lib-dynamodb';
import { mockClient } from 'aws-sdk-client-mock';
import { DynamoPointEventRepository } from '../DynamoPointEventRepository';
import { PointEvent } from '../../../../../domain/entities/map/PointEvent';
import { PointInfoId } from '../../../../../domain/value-object/map/pointInfoId';
import { ThreadName } from '../../../../../domain/value-object/map/threadName';

const ddbMock = mockClient(DynamoDBDocumentClient);

describe('DynamoPointEventRepository', () => {
    let repository: DynamoPointEventRepository;

    beforeEach(() => {
        ddbMock.reset();
        repository = new DynamoPointEventRepository();
    });

    test('save should put item', async () => {
        const event = PointEvent.create(
            PointInfoId.create(),
            new ThreadName('Thread 1'),
            'http://img.com',
            new Date(),
            new Date(),
            'Detail',
            'http://event.com',
        );

        ddbMock.on(PutCommand).resolves({});

        await repository.save(event);

        expect(ddbMock.calls()).toHaveLength(1);
        const input = ddbMock.call(0).args[0] as any;
        expect(input.input.TableName).toBe('PointEvents');
        expect(input.input.Item.id).toBe(event.getId().getValue());
    });

    test('findByPointInfoId should return event', async () => {
        const pid = PointInfoId.create();
        const mockItem = {
            id: 'ev-1',
            pointInfoId: pid.getValue(),
            threadName: 'T1',
            imageUrl: 'img',
            createdAt: new Date().toISOString(),
            startDate: new Date().toISOString(),
            endDate: new Date().toISOString(),
            detail: 'Detail',
            url: 'url',
            deletedAt: null,
        };

        ddbMock.on(QueryCommand).resolves({
            Items: [mockItem],
        });

        const result = await repository.findByPointInfoId(pid.getValue());

        expect(result).not.toBeNull();
        expect(result?.getId().getValue()).toBe('ev-1');
    });

    test('findByThreadName should return list', async () => {
        const pid = PointInfoId.create();
        // Mock item point info id must be valid if Entity validates it on load.
        // PointEvent.fromExisting uses PointInfoId.
        const mockItem = {
            id: 'ev-1',
            pointInfoId: pid.getValue(),
            threadName: 'Target',
            imageUrl: 'img',
            createdAt: new Date().toISOString(),
            startDate: new Date().toISOString(),
            endDate: new Date().toISOString(),
            detail: 'Detail',
            url: 'url',
            deletedAt: null,
        };

        ddbMock.on(QueryCommand).resolves({
            Items: [mockItem],
        });

        const result = await repository.findByThreadName('Target');

        expect(result).toHaveLength(1);
        expect(result[0].getThreadName().getValue()).toBe('Target');
    });
});
