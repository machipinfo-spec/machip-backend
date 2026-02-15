import { DynamoDBDocumentClient, PutCommand, GetCommand } from '@aws-sdk/lib-dynamodb';
import { mockClient } from 'aws-sdk-client-mock';
import { DynamoUserRepository } from '../DynamoUserRepository';
import { User } from '../../../../../domain/entities/user/user';
import { UserId } from '../../../../../domain/value-object/users/UserId';
import { AuthId } from '../../../../../domain/value-object/users/AuthId';
import { UserName } from '../../../../../domain/value-object/users/UserName';
import { Email } from '../../../../../domain/value-object/users/Email';

const ddbMock = mockClient(DynamoDBDocumentClient);

describe('DynamoUserRepository', () => {
    let repository: DynamoUserRepository;

    beforeEach(() => {
        ddbMock.reset();
        repository = new DynamoUserRepository();
    });

    test('save should put item to DynamoDB', async () => {
        const user = User.create(new AuthId('auth-123'), new UserName('testuser'), new Email('test@example.com'));

        ddbMock.on(PutCommand).resolves({});

        await repository.save(user);

        // Verify calls
        expect(ddbMock.calls()).toHaveLength(1);
        const input = ddbMock.call(0).args[0] as any;
        expect(input.input.TableName).toBe('Users'); // Default or env
        expect(input.input.Item.userId).toBe(user.userId.getValue());
        expect(input.input.Item.authId).toBe('auth-123');
        expect(input.input.Item.name).toBe('testuser');
    });

    test('findByUserId should return User when found', async () => {
        const userId = UserId.create();
        const mockItem = {
            userId: userId.getValue(),
            authId: 'auth-123',
            name: 'testuser',
            email: 'test@example.com',
            updatedAt: '2023-01-01T00:00:00.000Z',
        };

        ddbMock.on(GetCommand).resolves({
            Item: mockItem,
        });

        const result = await repository.findByUserId(userId);

        expect(result).not.toBeNull();
        expect(result?.userId.getValue()).toBe(userId.getValue());
        expect(result?.name.getValue()).toBe('testuser');
    });

    test('findByUserId should return null when not found', async () => {
        const userId = UserId.create();

        ddbMock.on(GetCommand).resolves({
            Item: undefined,
        });

        const result = await repository.findByUserId(userId);

        expect(result).toBeNull();
    });
});
