import { v4 as uuidv4 } from 'uuid';

export class PointEventId {
    private constructor(private readonly value: string) {}

    public static create(): PointEventId {
        return new PointEventId(uuidv4());
    }

    public static fromExisting(value: string): PointEventId {
        return new PointEventId(value);
    }

    public getValue(): string {
        return this.value;
    }
}
