import { ValueObject } from '../ValueObject';

export class DeliveredAt extends ValueObject<Date> {
    protected validate(): void {
        if (!(this.value instanceof Date) || isNaN(this.value.getTime())) {
            throw new Error('Invalid date for DeliveredAt');
        }
    }

    constructor(date: Date) {
        // 新しいDateインスタンスを作成してディープコピー
        const frozenDate = new Date(date.getTime());
        Object.freeze(frozenDate);

        super(frozenDate);
        Object.freeze(this);
    }

    public static create(date: Date): DeliveredAt {
        return new DeliveredAt(date);
    }

    public static now(): DeliveredAt {
        return new DeliveredAt(new Date());
    }

    public static fromISOString(isoString: string): DeliveredAt {
        return new DeliveredAt(new Date(isoString));
    }

    public toISOString(): string {
        return this.value.toISOString();
    }

    public isBefore(other: DeliveredAt): boolean {
        return this.value < other.value;
    }

    public isAfter(other: DeliveredAt): boolean {
        return this.value > other.value;
    }

    // イミュータブルな更新メソッド
    public withDate(date: Date): DeliveredAt {
        return new DeliveredAt(date);
    }

    public addDays(days: number): DeliveredAt {
        const newDate = new Date(this.value.getTime());
        newDate.setDate(newDate.getDate() + days);
        return new DeliveredAt(newDate);
    }
}
