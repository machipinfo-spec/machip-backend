import { DynamoDBDocumentClient, PutCommand, GetCommand, QueryCommand, UpdateCommand } from '@aws-sdk/lib-dynamodb';
import { mockClient } from 'aws-sdk-client-mock';
import { DynamoProfileRepository } from '../DynamoProfileRepository';
import { Profile } from '../../../../../domain/entities/profile/profile';
import { UserId } from '../../../../../domain/value-object/users/UserId';
import { UserName } from '../../../../../domain/value-object/users/UserName';
import { ImageUrl } from '../../../../../domain/value-object/users/ImageUrl';
import { Introduction } from '../../../../../domain/value-object/profile/Introduction';
import { ProfileUrl } from '../../../../../domain/value-object/profile/ProfileUrl';

const ddbMock = mockClient(DynamoDBDocumentClient);

describe('DynamoProfileRepository', () => {
    let repository: DynamoProfileRepository;

    beforeEach(() => {
        ddbMock.reset();
        repository = new DynamoProfileRepository();
    });

    test('save should put item', async () => {
        const profile = Profile.create(
            UserId.create(),
            new UserName('testuser'),
            new ImageUrl('http://example.com/img.png'),
            new Introduction('Hello'),
            new ProfileUrl('http://profile.com'),
        );

        ddbMock.on(PutCommand).resolves({});

        await repository.save(profile);

        expect(ddbMock.calls()).toHaveLength(1);
        const input = ddbMock.call(0).args[0] as any;
        expect(input.input.TableName).toBe('Profiles');
        expect(input.input.Item.profileId).toBe(profile.profileId.getValue());
    });

    test('findByUserId should return correct profile', async () => {
        const userId = UserId.create(); // Valid ID
        const profileId = '123e4567-e89b-42d3-a456-426614174002';
        const mockItem = {
            profileId: profileId,
            userId: userId.getValue(),
            userName: 'testuser',
            imageUrl: 'http://img.png',
            introduction: 'Intro',
            url: 'http://url.com',
            isDeleted: false,
        };

        ddbMock.on(QueryCommand).resolves({
            Items: [mockItem],
        });

        const result = await repository.findByUserId(userId);

        expect(result).not.toBeNull();
        expect(result?.profileId.getValue()).toBe(profileId);
    });

    test('findByUserId should return null if all deleted', async () => {
        const userId = UserId.create();
        const profileId = '123e4567-e89b-42d3-a456-426614174003';
        const mockItem = {
            profileId: profileId,
            userId: userId.getValue(),
            isDeleted: true,
        };

        ddbMock.on(QueryCommand).resolves({
            Items: [mockItem],
        });

        const result = await repository.findByUserId(userId);

        expect(result).toBeNull();
    });
});
