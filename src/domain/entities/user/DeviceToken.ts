import { ValueObject } from '../../value-object/ValueObject';

export class DeviceToken extends ValueObject<string> {
    private readonly userId: string;
    private readonly platform: string;
    private readonly createdAt: Date;
    private readonly lastUsedAt: Date;

    private constructor(token: string, userId: string, platform: string, createdAt: Date, lastUsedAt: Date) {
        super(token);
        this.userId = userId;
        this.platform = platform;
        this.createdAt = createdAt;
        this.lastUsedAt = lastUsedAt;
    }

    public static create(token: string, userId: string, platform: string): DeviceToken {
        const now = new Date();
        return new DeviceToken(token, userId, platform, now, now);
    }

    public static reconstruct(
        token: string,
        userId: string,
        platform: string,
        createdAt: Date,
        lastUsedAt: Date,
    ): DeviceToken {
        return new DeviceToken(token, userId, platform, createdAt, lastUsedAt);
    }

    public getToken(): string {
        return this.value;
    }

    public getUserId(): string {
        return this.userId;
    }

    public getPlatform(): string {
        return this.platform;
    }

    public getCreatedAt(): Date {
        return this.createdAt;
    }

    public getLastUsedAt(): Date {
        return this.lastUsedAt;
    }

    public updateLastUsedAt(): DeviceToken {
        return new DeviceToken(this.value, this.userId, this.platform, this.createdAt, new Date());
    }

    protected validate(): void {
        if (!this.value) {
            throw new Error('Device token is required');
        }
    }
}
