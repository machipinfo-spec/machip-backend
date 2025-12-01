// User.ts (集約ルート)

import { AuthId } from "../../value-object/users/AuthId";
import { Email } from "../../value-object/users/Email";
import { UserId } from "../../value-object/users/UserId";
import { UserName } from "../../value-object/users/UserName";

// DTOインターフェース
export interface UserDTO {
    authId: string;
    userId: string;
    name: string;
    email: string;
}

export class User {
    private readonly _authId: AuthId;
    private readonly _userId: UserId;
    private _name: UserName;
    private _email: Email;

    // 直接のインスタンス化を制限
    private constructor(authId: AuthId, userId: UserId, name: UserName, email: Email) {
        this._authId = authId;
        this._userId = userId;
        this._name = name;
        this._email = email;

        // 集約全体の整合性チェック
        this.validateState();
    }

    // 整合性チェックメソッド
    private validateState(): void {
        // ここでユーザーの状態に関する整合性制約を検証
        // 例：メールドメインが許可リストにあるか、などのクロスフィールド検証
    }

    // ファクトリメソッド - 新規ユーザー作成
    public static create(authId: AuthId, name: UserName, email: Email): User {
        const userId = UserId.create(); // 新しいUUIDを生成
        return new User(authId, userId, name, email);
    }

    // ファクトリメソッド - 既存ユーザー再構築（リポジトリから取得する場合など）
    public static reconstitute(authId: AuthId, userId: UserId, name: UserName, email: Email): User {
        return new User(authId, userId, name, email);
    }

    // DTOからのインスタンス作成（リポジトリから取得時など）
    public static fromDTO(dto: UserDTO): User {
        return User.reconstitute(
            new AuthId(dto.authId),
            UserId.fromExisting(dto.userId),
            new UserName(dto.name),
            new Email(dto.email),
        );
    }

    // DTOへの変換（永続化時など）
    public toDTO(): UserDTO {
        return {
            authId: this._authId.getValue(),
            userId: this._userId.getValue(),
            name: this._name.getValue(),
            email: this._email.getValue(),
        };
    }

    // ゲッターメソッド
    public get authId(): AuthId {
        return this._authId;
    }

    public get userId(): UserId {
        return this._userId;
    }

    public get name(): UserName {
        return this._name;
    }

    public get email(): Email {
        return this._email;
    }

    // 状態変更メソッド（不変性を保ったイミュータブルな更新）
    public changeName(newName: UserName): User {
        return User.reconstitute(this._authId, this._userId, newName, this._email);
    }

    public changeEmail(newEmail: Email): User {
        return User.reconstitute(this._authId, this._userId, this._name, newEmail);
    }

    // ドメインロジックを含むビジネスメソッド
    public isAdmin(): boolean {
        // 何らかのビジネスロジックに基づいてユーザーが管理者かどうかを判断
        // 例：特定のメールドメインを持つユーザーは管理者など
        return this._email.getValue().endsWith('@admin.example.com');
    }

    public canAccess(resource: string): boolean {
        // アクセス権の判定など
        // 例えば、ユーザータイプに応じたリソースアクセス権限の確認など
        return true; // 実際のロジックに置き換える
    }

    // 同一性の比較 (エンティティの同一性はIDに基づく)
    public equals(other?: User): boolean {
        if (!other) {
            return false;
        }

        return this._userId.equals(other._userId);
    }
}
