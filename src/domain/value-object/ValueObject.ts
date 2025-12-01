export abstract class ValueObject<T> {
    constructor(protected readonly value: T) {
        this.validate();
    }

    protected abstract validate(): void;

    public equals(vo?: ValueObject<T>): boolean {
        if (vo === null || vo === undefined) {
            return false;
        }

        return JSON.stringify(this.value) === JSON.stringify(vo.value);
    }

    public getValue(): T {
        return this.value;
    }
}
