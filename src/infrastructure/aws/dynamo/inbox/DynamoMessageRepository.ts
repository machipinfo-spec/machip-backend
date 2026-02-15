import {
    DynamoDBDocumentClient,
    GetCommand,
    PutCommand,
    ScanCommand,
    QueryCommand,
    DeleteCommand,
    UpdateCommand,
} from '@aws-sdk/lib-dynamodb';
import { IMessageRepository } from '../../../../domain/repositories/inbox/IMessageRepository';
import { Message, MessageDTO } from '../../../../domain/entities/inbox/Message';
import { MessageCollection } from '../../../../domain/entities/inbox/MessageCollection';
import { MessageId } from '../../../../domain/value-object/inbox/MessageId';
import { MessageType, MessageTypeValue } from '../../../../domain/value-object/inbox/MessageType';
import { UserId } from '../../../../domain/value-object/users/UserId';
import { DynamoDBClientFactory } from '../client';

export class DynamoMessageRepository implements IMessageRepository {
    private readonly client: DynamoDBDocumentClient;
    private readonly tableName: string;

    constructor() {
        this.client = DynamoDBClientFactory.create();
        this.tableName = 'Messages';
    }

    async save(message: Message): Promise<void> {
        const dto = message.toDTO();
        const item = {
            id: dto.messageId, // Unified ID field name
            messageId: dto.messageId,
            type: dto.type,
            subject: dto.subject,
            content: dto.content, // JSON string or object
            senderUserId: dto.senderUserId,
            createdAt: dto.createdAt,
            isRead: dto.isRead,
            updatedAt: new Date().toISOString(),
        };

        await this.client.send(
            new PutCommand({
                TableName: this.tableName,
                Item: item,
            }),
        );
    }

    async findById(id: MessageId): Promise<Message | null> {
        const result = await this.client.send(
            new GetCommand({
                TableName: this.tableName,
                Key: {
                    id: id.getValue(),
                },
            }),
        );

        if (!result.Item) {
            return null;
        }

        return this.mapToEntity(result.Item);
    }

    async findAll(): Promise<MessageCollection> {
        const result = await this.client.send(
            new ScanCommand({
                TableName: this.tableName,
            }),
        );

        const messages = result.Items ? result.Items.map((item) => this.mapToEntity(item)) : [];
        // Sort descending
        return MessageCollection.create(messages).sortByCreatedAtDesc();
    }

    async findByType(type: MessageType): Promise<MessageCollection> {
        const result = await this.client.send(
            new QueryCommand({
                TableName: this.tableName,
                IndexName: 'TypeIndex', // Assumed GSI
                KeyConditionExpression: '#type = :type',
                ExpressionAttributeValues: {
                    ':type': type.getValue(),
                },
                ScanIndexForward: false, // Descending
            }),
        );

        const messages = result.Items ? result.Items.map((item) => this.mapToEntity(item)) : [];
        return MessageCollection.create(messages);
    }

    async findBySenderId(senderId: string): Promise<MessageCollection> {
        const result = await this.client.send(
            new QueryCommand({
                TableName: this.tableName,
                IndexName: 'SenderIdIndex',
                KeyConditionExpression: 'senderUserId = :sid',
                ExpressionAttributeValues: {
                    ':sid': senderId,
                },
                ScanIndexForward: false, // Descending
            }),
        );

        const messages = result.Items ? result.Items.map((item) => this.mapToEntity(item)) : [];
        return MessageCollection.create(messages);
    }

    async findByFilter(filter: {
        type?: MessageTypeValue | 'all';
        senderId?: string;
        limit?: number;
        offset?: number;
        searchText?: string;
    }): Promise<MessageCollection> {
        // Complex filter needs Scan if no single index matches
        // If senderId present, use SenderIdIndex
        // If type present, use TypeIndex
        // If both? FilterExpression.

        let queryParams: any = {
            TableName: this.tableName,
        };

        if (filter.senderId) {
            queryParams.IndexName = 'SenderIdIndex'; // Optimization
            queryParams.KeyConditionExpression = 'senderUserId = :sid';
            queryParams.ExpressionAttributeValues = { ':sid': filter.senderId };
            queryParams.ScanIndexForward = false; // Descending
        } else if (filter.type && filter.type !== 'all') {
            queryParams.IndexName = 'TypeIndex';
            queryParams.KeyConditionExpression = '#type = :type';
            queryParams.ExpressionAttributeNames = { '#type': 'type' };
            queryParams.ExpressionAttributeValues = { ':type': filter.type };
            queryParams.ScanIndexForward = false; // Descending
        } else {
            // Scan
        }

        // Apply remaining filters via FilterExpression
        // Excluding the one used in KeyCondition
        let filterExps: string[] = [];
        let attrValues = queryParams.ExpressionAttributeValues || {};
        let attrNames = queryParams.ExpressionAttributeNames || {};

        if (filter.type && filter.type !== 'all' && !queryParams.IndexName?.includes('Type')) {
            filterExps.push('#type = :type');
            attrNames['#type'] = 'type';
            attrValues[':type'] = filter.type;
        }

        if (filter.senderId && !queryParams.IndexName?.includes('Sender')) {
            filterExps.push('senderUserId = :sid');
            attrValues[':sid'] = filter.senderId;
        }

        if (filter.searchText) {
            filterExps.push('(contains(subject, :txt) OR contains(content, :txt))');
            attrValues[':txt'] = filter.searchText;
        }

        if (filterExps.length > 0) {
            queryParams.FilterExpression = filterExps.join(' AND ');
            queryParams.ExpressionAttributeValues = attrValues;
            queryParams.ExpressionAttributeNames = attrNames;
        }

        if (filter.limit) {
            queryParams.Limit = filter.limit;
        }

        // Execute
        let result;
        if (queryParams.KeyConditionExpression) {
            result = await this.client.send(new QueryCommand(queryParams));
        } else {
            result = await this.client.send(new ScanCommand(queryParams));
        }

        const messages = result.Items ? result.Items.map((item) => this.mapToEntity(item)) : [];
        return MessageCollection.create(messages);
    }

    async findDeliveredToUser(
        userId: UserId,
        filter?: { type?: MessageTypeValue | 'all'; isRead?: boolean; limit?: number; offset?: number },
    ): Promise<MessageCollection> {
        // This requires joining UserMessage and Message tables.
        // Step 1: Query UserMessage table to get messageIds for userId
        // Step 2: BatchGet Message table.
        // Since I cannot import DynamoUserMessageRepository here easily without DI,
        // I will implement raw query to UserMessage table if I know the name, OR leave this as "Not Implemented" but it's critical.
        // It's better to implement.

        // Assume UserMessages table name
        const userMsgTable = process.env.USER_MESSAGE_TABLE_NAME || 'UserMessages';

        // Query UserMessages
        const userMsgParams: any = {
            TableName: userMsgTable,
            IndexName: 'UserIdIndex',
            KeyConditionExpression: 'userId = :uid',
            ExpressionAttributeValues: { ':uid': userId.getValue() },
        };

        if (typeof filter?.isRead === 'boolean') {
            userMsgParams.FilterExpression = 'isRead = :isRead';
            userMsgParams.ExpressionAttributeValues[':isRead'] = filter.isRead;
        }

        if (filter?.limit) userMsgParams.Limit = filter.limit;

        const userMsgResult = await this.client.send(new QueryCommand(userMsgParams));
        if (!userMsgResult.Items || userMsgResult.Items.length === 0) {
            return MessageCollection.create([]);
        }

        const messageIds = userMsgResult.Items.map((um) => um.messageId);

        // BatchGet Messages
        // Chunk by 100 (DynamoDB limit) or 25 (BatchGet limit)
        // BatchGetItem limit is 100 items AND 16MB.
        const msgIdsUnique = [...new Set(messageIds)];
        if (msgIdsUnique.length === 0) return MessageCollection.create([]);

        // Simplistic BatchGet assuming < 100 items for now.
        // In robust impl, use chunking util.
        const keys = msgIdsUnique.map((id) => ({ id: id }));

        // Using a helper or loop for BatchGet not implemented here for brevity,
        // but essential for production.
        // I will assume simple sequential gets if batch logic is too long, OR minimal batch.
        // Actually, just Fetching in parallel is easier to write correct code for now (Promise.all).
        const promises = msgIdsUnique.map((id) => this.findById(new MessageId(id)));
        const messages = (await Promise.all(promises)).filter((m): m is Message => m !== null);

        // Filter by type if needed (since we only joined, type is in Message)
        let collection = MessageCollection.create(messages);

        if (filter?.type && filter.type !== 'all') {
            collection = collection.getMessagesByType(filter.type);
        }

        return collection;
    }

    async update(message: Message): Promise<void> {
        await this.save(message);
    }

    async delete(id: MessageId): Promise<void> {
        await this.client.send(
            new DeleteCommand({
                TableName: this.tableName,
                Key: { id: id.getValue() },
            }),
        );
    }

    async exists(id: MessageId): Promise<boolean> {
        const item = await this.findById(id);
        return item !== null;
    }

    async count(): Promise<number> {
        // Scan with Select COUNT
        const result = await this.client.send(
            new ScanCommand({
                TableName: this.tableName,
                Select: 'COUNT',
            }),
        );
        return result.Count || 0;
    }

    async deleteOlderThan(date: Date): Promise<number> {
        // Scan for old items then Delete
        // Expensive. Lifecycle Policy is better.
        // Implementation:
        const result = await this.client.send(
            new ScanCommand({
                TableName: this.tableName,
                FilterExpression: 'createdAt < :date',
                ExpressionAttributeValues: { ':date': date.toISOString() },
                ProjectionExpression: 'id',
            }),
        );

        if (!result.Items || result.Items.length === 0) return 0;

        // Delete each
        let deleted = 0;
        for (const item of result.Items) {
            await this.delete(new MessageId(item.id));
            deleted++;
        }
        return deleted;
    }

    async search(
        searchText: string,
        filter?: { type?: MessageTypeValue | 'all'; limit?: number; offset?: number },
    ): Promise<MessageCollection> {
        return this.findByFilter({ searchText, type: filter?.type, limit: filter?.limit, offset: filter?.offset });
    }

    private mapToEntity(item: any): Message {
        return Message.fromDTO({
            messageId: item.id || item.messageId, // Handle both just in case
            type: item.type,
            subject: item.subject,
            content: item.content,
            senderUserId: item.senderUserId,
            createdAt: item.createdAt,
            isRead: item.isRead,
        } as MessageDTO);
    }
}
