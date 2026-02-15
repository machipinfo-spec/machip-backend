import {
    DynamoDBDocumentClient,
    GetCommand,
    PutCommand,
    DeleteCommand,
    QueryCommand,
    BatchGetCommand,
    UpdateCommand,
} from '@aws-sdk/lib-dynamodb';
import { IProfileRepository } from '../../../../domain/repositories/profile/IProfileRepository';
import { Profile } from '../../../../domain/entities/profile/profile';
import { ProfileId } from '../../../../domain/value-object/profile/ProfileId';
import { UserId } from '../../../../domain/value-object/users/UserId';
import { DynamoDBClientFactory } from '../client';

export class DynamoProfileRepository implements IProfileRepository {
    private readonly client: DynamoDBDocumentClient;
    private readonly tableName: string;

    constructor() {
        this.client = DynamoDBClientFactory.create();
        this.tableName = 'Profiles';
    }

    async save(profile: Profile): Promise<void> {
        const dto = profile.toDTO();
        const item = {
            profileId: dto.profileId,
            userId: dto.userId,
            userName: dto.userName,
            imageUrl: dto.imageUrl,
            introduction: dto.introduction,
            url: dto.url,
            isDeleted: false,
            updatedAt: new Date().toISOString(),
        };

        await this.client.send(
            new PutCommand({
                TableName: this.tableName,
                Item: item,
            }),
        );
    }

    async delete(profile: Profile): Promise<void> {
        await this.client.send(
            new DeleteCommand({
                TableName: this.tableName,
                Key: {
                    profileId: profile.profileId.getValue(),
                },
            }),
        );
    }

    async update(profile: Profile): Promise<void> {
        await this.save(profile);
    }

    async findByProfileId(profileId: ProfileId): Promise<Profile | null> {
        const result = await this.client.send(
            new GetCommand({
                TableName: this.tableName,
                Key: {
                    profileId: profileId.getValue(),
                },
            }),
        );

        if (!result.Item || result.Item.isDeleted) {
            return null;
        }

        return this.mapToEntity(result.Item);
    }

    async findByUserId(userId: UserId): Promise<Profile | null> {
        const result = await this.client.send(
            new QueryCommand({
                TableName: this.tableName,
                IndexName: 'UserIdIndex',
                KeyConditionExpression: 'userId = :userId',
                ExpressionAttributeValues: {
                    ':userId': userId.getValue(),
                },
            }),
        );

        if (!result.Items || result.Items.length === 0) {
            return null;
        }

        // Assuming 1 active profile per user or taking the first one
        // Also check soft delete
        const validProfiles = result.Items.filter((item) => !item.isDeleted);
        if (validProfiles.length === 0) return null;

        return this.mapToEntity(validProfiles[0]);
    }

    async findByUserIds(userIds: UserId[]): Promise<Profile[]> {
        if (userIds.length === 0) return [];

        // Since userId is likely a GSI, we can't use BatchGetItem easily.
        // We have to execute multiple queries.
        // Optimization: PartiQL or Promise.all (with limit)
        // For simplicity and typical expected batch size, Promise.all is okay.

        const promises = userIds.map((id) => this.findByUserId(id));
        const results = await Promise.all(promises);

        return results.filter((p): p is Profile => p !== null);
    }

    async softDelete(profileId: ProfileId): Promise<void> {
        await this.client.send(
            new UpdateCommand({
                TableName: this.tableName,
                Key: {
                    profileId: profileId.getValue(),
                },
                UpdateExpression: 'SET isDeleted = :true',
                ExpressionAttributeValues: {
                    ':true': true,
                },
            }),
        );
    }

    private mapToEntity(item: any): Profile {
        return Profile.fromDTO({
            profileId: item.profileId,
            userId: item.userId,
            userName: item.userName,
            imageUrl: item.imageUrl,
            introduction: item.introduction,
            url: item.url,
        });
    }
}
