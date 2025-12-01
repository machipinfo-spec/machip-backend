// domain/valueObjects/IdValueObject.ts
import { v4 as uuidv4 } from 'uuid';
import { ValueObject } from './ValueObject';

export abstract class IdValueObject<T extends string> extends ValueObject<T> {
    protected validate(): void {
        if (!this.isValid(this.value)) {
            throw new Error(`Invalid ID format for ${this.constructor.name}`);
        }
    }

    protected isValid(value: string): boolean {
        // UUID v4の検証パターン
        const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
        return uuidPattern.test(value);
    }

    // 新規ID生成のための静的メソッド（サブクラスで実装）
    public static create(): IdValueObject<string> {
        throw new Error('This method should be implemented by subclasses');
    }

    // 既存のUUIDからインスタンスを作成するための静的メソッド（サブクラスで実装）
    public static fromExisting(id: string): IdValueObject<string> {
        throw new Error('This method should be implemented by subclasses');
    }
}
