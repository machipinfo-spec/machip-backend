import { ValueObject } from '../ValueObject';

export class CreatedAt extends ValueObject<Date> {
    protected validate(): void {
        if (!(this.value instanceof Date) || isNaN(this.value.getTime())) {
            throw new Error('Invalid date for CreatedAt');
        }

        // 未来の日付は許可しない
        if (this.value > new Date()) {
            throw new Error('CreatedAt cannot be in the future');
        }
    }

    constructor(date: Date) {
        // 新しいDateインスタンスを作成してディープコピー
        const frozenDate = new Date(date.getTime());
        Object.freeze(frozenDate);

        super(frozenDate);
        Object.freeze(this);
    }

    public static create(date: Date): CreatedAt {
        return new CreatedAt(date);
    }

    public static now(): CreatedAt {
        return new CreatedAt(new Date());
    }

    public static fromISOString(isoString: string): CreatedAt {
        return new CreatedAt(new Date(isoString));
    }

    public toISOString(): string {
        return this.value.toISOString();
    }

    public isBefore(other: CreatedAt): boolean {
        return this.value < other.value;
    }

    public isAfter(other: CreatedAt): boolean {
        return this.value > other.value;
    }

    // イミュータブルな更新メソッド（通常CreatedAtは変更しないが、必要に応じて）
    public withDate(date: Date): CreatedAt {
        return new CreatedAt(date);
    }

    public getAgeInDays(): number {
        const now = new Date();
        const diffTime = Math.abs(now.getTime() - this.value.getTime());
        return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    }

    public getAgeInHours(): number {
        const now = new Date();
        const diffTime = Math.abs(now.getTime() - this.value.getTime());
        return Math.ceil(diffTime / (1000 * 60 * 60));
    }
}
