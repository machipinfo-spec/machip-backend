import { MessageRepository } from './MessageRepository';
import { UserMessageRepository } from './UserMessageRepository';
import { MessageBroadcastRepository } from './MessageBroadcastRepository';
import { IMessageBroadcastRepository } from '../../../../domain/repositories/inbox/IMessageBroadcastRepository';
import { IMessageRepository } from '../../../../domain/repositories/inbox/IMessageRepository';
import { IUserMessageRepository } from '../../../../domain/repositories/inbox/IUserMessageRepository';
import { Logger } from '../../../../shared/logger';
import { IProfileRepository } from '../../../../domain/repositories/profile/IProfileRepository.ts';
import { ProfileRepository } from '../profile/ProfileRepository';

export class InboxRepositoryModule {
    private static _messageRepository: IMessageRepository;
    private static _userMessageRepository: IUserMessageRepository;
    private static _messageBroadcastRepository: IMessageBroadcastRepository;
    private static _profileRepository: IProfileRepository;
    private static _logger: Logger;

    public static getMessageRepository(): IMessageRepository {
        if (!this._messageRepository) {
            this._messageRepository = new MessageRepository(this.getLogger());
        }
        return this._messageRepository;
    }

    public static getUserMessageRepository(): IUserMessageRepository {
        if (!this._userMessageRepository) {
            this._userMessageRepository = new UserMessageRepository(this.getLogger());
        }
        return this._userMessageRepository;
    }

    public static getMessageBroadcastRepository(): IMessageBroadcastRepository {
        if (!this._messageBroadcastRepository) {
            this._messageBroadcastRepository = new MessageBroadcastRepository(this.getLogger());
        }
        return this._messageBroadcastRepository;
    }

    private static getLogger(): Logger {
        if (!this._logger) {
            this._logger = new Logger('InboxModule');
        }
        return this._logger;
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

    public static getProfileRepository(): IProfileRepository {
        if (!this._profileRepository) {
            this._profileRepository = new ProfileRepository();
        }
        return this._profileRepository;
    }
}
