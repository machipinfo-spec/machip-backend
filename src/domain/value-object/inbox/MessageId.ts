import { v4 as uuidv4 } from 'uuid';
import { IdValueObject } from '../IdValueObject';

export class MessageId extends IdValueObject<string> {
    constructor(id: string) {
        super(id);
        Object.freeze(this);
    }

    public static create(): MessageId {
        return new MessageId(uuidv4());
    }

    public static fromExisting(id: string): MessageId {
        return new MessageId(id);
    }

    // イミュータブルな更新メソッド（通常IDは変更しないが、必要に応じて）
    public regenerate(): MessageId {
        return new MessageId(uuidv4());
    }
}
