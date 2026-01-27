import { IMessageRepository } from '../../../domain/repositories/inbox/IMessageRepository';
import { IUserMessageRepository } from '../../../domain/repositories/inbox/IUserMessageRepository';
import { IMessageBroadcastRepository } from '../../../domain/repositories/inbox/IMessageBroadcastRepository';
import { IProfileRepository } from '../../../domain/repositories/profile/IProfileRepository';
import { Logger } from '../../../shared/logger';

// Firebase Imports
import { MessageRepository as FirebaseMessageRepository } from '../../firebase/persistence/inbox/MessageRepository';
import { UserMessageRepository as FirebaseUserMessageRepository } from '../../firebase/persistence/inbox/UserMessageRepository';
import { MessageBroadcastRepository as FirebaseMessageBroadcastRepository } from '../../firebase/persistence/inbox/MessageBroadcastRepository';
import { ProfileRepository as FirebaseProfileRepository } from '../../firebase/persistence/profile/ProfileRepository';

// DynamoDB Imports
import { DynamoMessageRepository } from '../../aws/dynamo/inbox/DynamoMessageRepository';
import { DynamoUserMessageRepository } from '../../aws/dynamo/inbox/DynamoUserMessageRepository';
import { DynamoMessageBroadcastRepository } from '../../aws/dynamo/inbox/DynamoMessageBroadcastRepository';
import { DynamoProfileRepository } from '../../aws/dynamo/profile/DynamoProfileRepository';

export class InboxRepositoryModule {
    private static _messageRepository: IMessageRepository;
    private static _userMessageRepository: IUserMessageRepository;
    private static _messageBroadcastRepository: IMessageBroadcastRepository;
    private static _profileRepository: IProfileRepository;
    private static _logger: Logger;

    private static getLogger(): Logger {
        if (!this._logger) {
            this._logger = new Logger('InboxModule');
        }
        return this._logger;
    }

    private static shouldUseDynamo(): boolean {
        return process.env.USE_DYNAMO_DB === 'true';
    }

    public static getMessageRepository(): IMessageRepository {
        if (!this._messageRepository) {
            if (this.shouldUseDynamo()) {
                this._messageRepository = new DynamoMessageRepository();
            } else {
                this._messageRepository = new FirebaseMessageRepository(this.getLogger());
            }
        }
        return this._messageRepository;
    }

    public static getUserMessageRepository(): IUserMessageRepository {
        if (!this._userMessageRepository) {
            if (this.shouldUseDynamo()) {
                this._userMessageRepository = new DynamoUserMessageRepository();
            } else {
                this._userMessageRepository = new FirebaseUserMessageRepository(this.getLogger());
            }
        }
        return this._userMessageRepository;
    }

    public static getMessageBroadcastRepository(): IMessageBroadcastRepository {
        if (!this._messageBroadcastRepository) {
            if (this.shouldUseDynamo()) {
                this._messageBroadcastRepository = new DynamoMessageBroadcastRepository();
            } else {
                this._messageBroadcastRepository = new FirebaseMessageBroadcastRepository(this.getLogger());
            }
        }
        return this._messageBroadcastRepository;
    }

    public static getProfileRepository(): IProfileRepository {
        if (!this._profileRepository) {
            if (this.shouldUseDynamo()) {
                this._profileRepository = new DynamoProfileRepository();
            } else {
                this._profileRepository = new FirebaseProfileRepository();
            }
        }
        return this._profileRepository;
    }

    // テスト用のモック設定
    public static setMessageRepository(repository: IMessageRepository): void {
        this._messageRepository = repository;
    }

    public static setUserMessageRepository(repository: IUserMessageRepository): void {
        this._userMessageRepository = repository;
    }

    public static setMessageBroadcastRepository(repository: IMessageBroadcastRepository): void {
        this._messageBroadcastRepository = repository;
    }
}
