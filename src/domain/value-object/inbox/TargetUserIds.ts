import { UserId } from '../users/UserId';
import { ValueObject } from '../ValueObject';

export class TargetUserIds extends ValueObject<ReadonlyArray<UserId>> {
    protected validate(): void {
        // constructorで既にArray.isArrayをチェックしているので、ここでは他のバリデーションのみ
        if (this.value.length === 0) {
            throw new Error('Target user IDs cannot be empty');
        }
        if (this.value.length > 10000) {
            throw new Error('Target user IDs cannot exceed 10,000 users');
        }
    }

    constructor(userIds: UserId[]) {
        // 先にバリデーションを実行
        if (!Array.isArray(userIds)) {
            throw new Error('Target user IDs must be an array');
        }

        // 重複除去と配列の凍結
        const uniqueUserIds = TargetUserIds.removeDuplicates(userIds);
        const frozenArray = Object.freeze([...uniqueUserIds]) as ReadonlyArray<UserId>;

        super(frozenArray);
        Object.freeze(this);
    }

    public static create(userIds: UserId[]): TargetUserIds {
        return new TargetUserIds(userIds);
    }

    public static single(userId: UserId): TargetUserIds {
        return new TargetUserIds([userId]);
    }

    private static removeDuplicates(userIds: UserId[]): UserId[] {
        const seen = new Set<string>();
        return userIds.filter((userId) => {
            const value = userId.getValue();
            if (seen.has(value)) {
                return false;
            }
            seen.add(value);
            return true;
        });
    }

    public count(): number {
        return this.value.length;
    }

    public contains(userId: UserId): boolean {
        return this.value.some((id) => id.equals(userId));
    }

    public getUserIds(): ReadonlyArray<UserId> {
        return this.value; // 既に凍結されているので安全
    }

    // イミュータブルな更新メソッド
    public add(userId: UserId): TargetUserIds {
        if (this.contains(userId)) {
            return this; // 既に含まれている場合は同じインスタンスを返す
        }
        return new TargetUserIds([...this.value, userId]);
    }

    public remove(userId: UserId): TargetUserIds {
        const filtered = this.value.filter((id) => !id.equals(userId));
        if (filtered.length === 0) {
            throw new Error('Cannot remove all target users');
        }
        return new TargetUserIds(filtered);
    }

    public addMultiple(userIds: UserId[]): TargetUserIds {
        const newUserIds = [...this.value, ...userIds];
        return new TargetUserIds(newUserIds);
    }

    public removeMultiple(userIds: UserId[]): TargetUserIds {
        const userIdsToRemove = new Set(userIds.map((id) => id.getValue()));
        const filtered = this.value.filter((id) => !userIdsToRemove.has(id.getValue()));

        if (filtered.length === 0) {
            throw new Error('Cannot remove all target users');
        }
        return new TargetUserIds(filtered);
    }

    public intersect(other: TargetUserIds): TargetUserIds {
        const otherValues = new Set(other.value.map((id) => id.getValue()));
        const intersection = this.value.filter((id) => otherValues.has(id.getValue()));

        if (intersection.length === 0) {
            throw new Error('Intersection cannot be empty');
        }
        return new TargetUserIds(intersection);
    }

    public union(other: TargetUserIds): TargetUserIds {
        return new TargetUserIds([...this.value, ...other.value]);
    }

    // 便利メソッド
    public isEmpty(): boolean {
        return this.value.length === 0;
    }

    public isSingle(): boolean {
        return this.value.length === 1;
    }

    public getFirst(): UserId | null {
        return this.value.length > 0 ? this.value[0] : null;
    }

    public toArray(): UserId[] {
        return [...this.value];
    }

    public toStringArray(): string[] {
        return this.value.map((id) => id.getValue());
    }
}
