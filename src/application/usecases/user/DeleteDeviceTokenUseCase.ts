import { IDeviceTokenRepository } from '../../../domain/repositories/user/IDeviceTokenRepository';

export class DeleteDeviceTokenUseCase {
    constructor(private deviceTokenRepository: IDeviceTokenRepository) {}

    async execute(token: string): Promise<void> {
        await this.deviceTokenRepository.delete(token);
    }
}
