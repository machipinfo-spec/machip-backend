import { v4 as uuidv4 } from 'uuid';
import { DynamoDBDocumentClient, QueryCommand } from '@aws-sdk/lib-dynamodb';
import { mockClient } from 'aws-sdk-client-mock';
import { DynamoUserMessageRepository } from '../DynamoUserMessageRepository';
import { UserMessage } from '../../../../../domain/value-object/inbox/UserMessage';
import { UserMessageId } from '../../../../../domain/value-object/inbox/UserMessageId';
import { UserId } from '../../../../../domain/value-object/users/UserId';
import { MessageId } from '../../../../../domain/value-object/inbox/MessageId';
import { DeliveredAt } from '../../../../../domain/value-object/inbox/DeliveredAt';
import { ReadAt } from '../../../../../domain/value-object/inbox/ReadAt';

const ddbMock = mockClient(DynamoDBDocumentClient);

// Mock the client factory to return the mocked client instance implicitly handled by aws-sdk-client-mock?
// No, aws-sdk-client-mock intercepts calls to any client of that type.
// But we need DynamoDBClientFactory.create() to return A client.
// If it throws before returning, we are in trouble.
// We should mock the factory.

import { DynamoDBClientFactory } from '../../client';
jest.mock('../../client', () => {
    const { DynamoDBDocumentClient } = require('@aws-sdk/lib-dynamodb');
    const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
    return {
        DynamoDBClientFactory: {
            create: jest.fn(() => DynamoDBDocumentClient.from(new DynamoDBClient({}))),
        },
    };
});

describe('DynamoUserMessageRepository', () => {
    let repository: DynamoUserMessageRepository;

    beforeEach(() => {
        ddbMock.reset();
        repository = new DynamoUserMessageRepository();
    });

    test('findByFilter should respect limit and offset', async () => {
        // Arrange
        const userId = uuidv4();
        const totalItems = 30;
        const mockItems = Array.from({ length: totalItems }, (_, i) => ({
            id: uuidv4(),
            userId: userId,
            messageId: uuidv4(),
            deliveredAt: new Date(Date.now() - i * 1000).toISOString(), // Descending order
            isRead: false,
        }));

        // Mock QueryCommand to return all items (simulating what happens before we implement proper pagination logic in repo if we were just scanning, but here we expect the repo to slice it)
        // Wait, normally the repo sends Limit to Dynamo.
        // If we want to simulate offset, we usually ask for Limit = limit + offset, then slice manually.
        // So validation is: did we ask for correct Limit? And did we return correct slice?

        ddbMock.on(QueryCommand).resolves({
            Items: mockItems, // Return all for now, the repository should slice
            Count: totalItems,
        });

        // Act: Get page 2 (limit 10, offset 10) -> should get items 10-19
        const result = await repository.findByFilter({
            userId: userId,
            limit: 10,
            offset: 10,
        });

        // Assert
        // We expect the repository to have called Dynamo with Limit >= 20 (10+10)
        // And return exactly 10 items.
        // And those items should be mockItems[10] to mockItems[19].

        const calls = ddbMock.calls();
        expect(calls.length).toBeGreaterThan(0);
        const queryInput = calls[0].args[0].input as any;

        // This expectation validates if we updated the Limit calculation
        // expect(queryInput.Limit).toBeGreaterThanOrEqual(20);

        // This checks the result
        const messages = result.getAll();
        expect(messages).toHaveLength(10);
        // Compare IDs. Since UUIDs are random, we must use the mockItems array.
        const expectedIds = mockItems.slice(10, 20).map((i) => i.id);
        const actualIds = messages.map((m) => m.getId().getValue());
        expect(actualIds).toEqual(expectedIds);
    });
});
