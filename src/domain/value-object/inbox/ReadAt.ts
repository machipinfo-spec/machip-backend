import { ValueObject } from '../ValueObject';

export class ReadAt extends ValueObject<Date | null> {
    protected validate(): void {
        if (this.value !== null && (!(this.value instanceof Date) || isNaN(this.value.getTime()))) {
            throw new Error('Invalid date for ReadAt');
        }
    }

    constructor(date: Date | null) {
        let frozenDate: Date | null = null;
        if (date !== null) {
            frozenDate = new Date(date.getTime()); // 新しいDateインスタンスを作成
            Object.freeze(frozenDate);
        }

        super(frozenDate);
        Object.freeze(this);
    }

    public static create(date: Date): ReadAt {
        return new ReadAt(date);
    }

    public static now(): ReadAt {
        return new ReadAt(new Date());
    }

    public static unread(): ReadAt {
        return new ReadAt(null);
    }

    public static fromISOString(isoString: string | null): ReadAt {
        return new ReadAt(isoString ? new Date(isoString) : null);
    }

    public toISOString(): string | null {
        return this.value ? this.value.toISOString() : null;
    }

    public isRead(): boolean {
        return this.value !== null;
    }

    public isUnread(): boolean {
        return this.value === null;
    }

    public markAsRead(): ReadAt {
        return ReadAt.now();
    }

    // イミュータブルな更新メソッド
    public withDate(date: Date | null): ReadAt {
        return new ReadAt(date);
    }

    public markAsUnread(): ReadAt {
        return ReadAt.unread();
    }

    public readAtTime(date: Date): ReadAt {
        return new ReadAt(date);
    }
}
