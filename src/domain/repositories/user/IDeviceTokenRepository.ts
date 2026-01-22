import { DeviceToken } from '../../entities/user/DeviceToken';

export interface IDeviceTokenRepository {
    save(deviceToken: DeviceToken): Promise<void>;
    delete(token: string): Promise<void>;
    findByToken(token: string): Promise<DeviceToken | null>;
    findByUserId(userId: string): Promise<DeviceToken[]>;
    deleteTokens(tokens: string[]): Promise<void>;
}
