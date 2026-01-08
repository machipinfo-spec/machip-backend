import { v4 as uuidv4 } from 'uuid';
import { IdValueObject } from '../IdValueObject';

export class BroadcastId extends IdValueObject<string> {
    constructor(id: string) {
        super(id);
        Object.freeze(this);
    }

    public static create(): BroadcastId {
        return new BroadcastId(uuidv4());
    }

    public static fromExisting(id: string): BroadcastId {
        return new BroadcastId(id);
    }

    // イミュータブルな更新メソッド（通常IDは変更しないが、必要に応じて）
    public regenerate(): BroadcastId {
        return new BroadcastId(uuidv4());
    }
}
