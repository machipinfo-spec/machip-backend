import { ValueObject } from '../ValueObject';

export class MessageSubject extends ValueObject<string> {
    protected validate(): void {
        if (!this.value || this.value.trim().length === 0) {
            throw new Error('Message subject cannot be empty');
        }
        if (this.value.length > 200) {
            throw new Error('Message subject cannot exceed 200 characters');
        }
    }

    constructor(subject: string) {
        const trimmedSubject = subject.trim(); // プリミティブ値の正規化
        super(trimmedSubject);
        Object.freeze(this);
    }

    public static create(subject: string): MessageSubject {
        return new MessageSubject(subject);
    }

    // イミュータブルな更新メソッド
    public withSubject(subject: string): MessageSubject {
        return new MessageSubject(subject);
    }

    public appendText(text: string): MessageSubject {
        return new MessageSubject(this.value + text);
    }

    public prependText(text: string): MessageSubject {
        return new MessageSubject(text + this.value);
    }

    // 便利メソッド
    public getLength(): number {
        return this.value.length;
    }

    public isEmpty(): boolean {
        return this.value.trim().length === 0;
    }

    public startsWith(prefix: string): boolean {
        return this.value.startsWith(prefix);
    }

    public endsWith(suffix: string): boolean {
        return this.value.endsWith(suffix);
    }

    public contains(text: string): boolean {
        return this.value.includes(text);
    }
}
