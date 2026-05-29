import { v4 as uuidv4 } from 'uuid';
import { ValueObject } from '../ValueObject';

export class UserId extends ValueObject<string> {
    protected validate(): void {
        if (!this.isValid(this.value)) {
            throw new Error('Invalid UUID format');
        }
    }

    private isValid(value: string): boolean {
        const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
        return uuidPattern.test(value);
    }

    // 既存のUUIDからインスタンスを作成
    public static fromExisting(id: string): UserId {
        return new UserId(id);
    }

    // 新しいUUIDを生成してインスタンスを作成
    public static create(): UserId {
        return new UserId(uuidv4());
    }

    // システムユーザーID (固定値: UUID v4形式)
    public static readonly SYSTEM_ID = new UserId('a785ce49-0d19-49f0-a933-5b1a77ec7066');
    public static readonly AI_BOT = new UserId('0ef98563-984d-470b-a9f9-d34700034e72');

    public isSystem(): boolean {
        return this.equals(UserId.SYSTEM_ID);
    }
}
