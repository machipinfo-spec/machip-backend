import { IDeviceTokenRepository } from '../../../domain/repositories/user/IDeviceTokenRepository';
import { DeviceToken } from '../../../domain/entities/user/DeviceToken';

export interface RegisterDeviceTokenRequest {
    userId: string;
    token: string;
    platform: string;
}

export class RegisterDeviceTokenUseCase {
    constructor(private deviceTokenRepository: IDeviceTokenRepository) {}

    async execute(request: RegisterDeviceTokenRequest): Promise<void> {
        const existingToken = await this.deviceTokenRepository.findByToken(request.token);

        if (existingToken) {
            if (existingToken.getUserId() === request.userId) {
                // Determine if we should update usage time.
                // Logic: updateLastUsedAt returns a new instance.
                const updated = existingToken.updateLastUsedAt();
                await this.deviceTokenRepository.save(updated);
                return;
            } else {
                // Token exists but for different user -> overwrite ownership
                // Logic: implicitly "steal" the token for the new user
            }
        }

        const newToken = DeviceToken.create(request.token, request.userId, request.platform);
        await this.deviceTokenRepository.save(newToken);
    }
}
