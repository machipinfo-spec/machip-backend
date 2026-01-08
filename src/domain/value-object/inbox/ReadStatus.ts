import { ValueObject } from '../ValueObject';

export class ReadStatus extends ValueObject<boolean> {
    protected validate(): void {
        if (typeof this.value !== 'boolean') {
            throw new Error('ReadStatus must be a boolean value');
        }
    }

    constructor(status: boolean) {
        super(status);
        Object.freeze(this);
    }

    public static read(): ReadStatus {
        return new ReadStatus(true);
    }

    public static unread(): ReadStatus {
        return new ReadStatus(false);
    }

    public static fromBoolean(value: boolean): ReadStatus {
        return new ReadStatus(value);
    }

    public isRead(): boolean {
        return this.value === true;
    }

    public isUnread(): boolean {
        return this.value === false;
    }

    public markAsRead(): ReadStatus {
        return ReadStatus.read();
    }

    // イミュータブルな更新メソッド
    public markAsUnread(): ReadStatus {
        return ReadStatus.unread();
    }

    public toggle(): ReadStatus {
        return this.isRead() ? ReadStatus.unread() : ReadStatus.read();
    }

    // 便利メソッド
    public toBoolean(): boolean {
        return this.value;
    }

    public toString(): string {
        return this.value ? 'read' : 'unread';
    }
}
