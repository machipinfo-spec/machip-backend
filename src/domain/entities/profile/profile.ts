// Profile.ts (エンティティ)

import { UserName } from "../../value-object/users/UserName";
import { ImageUrl } from "../../value-object/users/ImageUrl";
import { UserId } from "../../value-object/users/UserId";
import { Introduction } from "../../value-object/profile/Introduction";
import { ProfileId } from "../../value-object/profile/ProfileId";
import { ProfileUrl } from "../../value-object/profile/ProfileUrl";

// DTOインターフェース
export interface ProfileDTO {
    profileId: string;
    userId: string;
    userName: string;
    imageUrl: string;
    introduction: string;
    url: string | null;
}

export class Profile {
    private readonly _profileId: ProfileId;
    private readonly _userId: UserId;
    private _userName: UserName;
    private _imageUrl: ImageUrl;
    private _introduction: Introduction;
    private _url: ProfileUrl;

    // 直接のインスタンス化を制限
    private constructor(
        profileId: ProfileId,
        userId: UserId,
        userName: UserName,
        imageUrl: ImageUrl,
        introduction: Introduction,
        url: ProfileUrl
    ) {
        this._profileId = profileId;
        this._userId = userId;
        this._userName = userName;
        this._imageUrl = imageUrl;
        this._introduction = introduction;
        this._url = url;

        // 集約全体の整合性チェック
        this.validateState();
    }

    // 整合性チェックメソッド
    private validateState(): void {
        // プロフィール全体の整合性制約を検証
        // 例：画像URLとユーザー名の組み合わせの妥当性など
    }

    // ファクトリメソッド - 新規プロフィール作成
    public static create(
        userId: UserId,
        userName: UserName,
        imageUrl: ImageUrl,
        introduction: Introduction,
        url: ProfileUrl
    ): Profile {
        const profileId = ProfileId.create(); // 新しいUUIDを生成
        return new Profile(profileId, userId, userName, imageUrl, introduction, url);
    }

    // ファクトリメソッド - 既存プロフィール再構築（リポジトリから取得する場合など）
    public static reconstitute(
        profileId: ProfileId,
        userId: UserId,
        userName: UserName,
        imageUrl: ImageUrl,
        introduction: Introduction,
        url: ProfileUrl
    ): Profile {
        return new Profile(profileId, userId, userName, imageUrl, introduction, url);
    }

    // DTOからのインスタンス作成（リポジトリから取得時など）
    public static fromDTO(dto: ProfileDTO): Profile {
        return Profile.reconstitute(
            ProfileId.fromExisting(dto.profileId),
            UserId.fromExisting(dto.userId),
            UserName.create(dto.userName),
            ImageUrl.create(dto.imageUrl),
            Introduction.create(dto.introduction),
            ProfileUrl.create(dto.url || "")
        );
    }

    // DTOへの変換（永続化時など）
    public toDTO(): ProfileDTO {
        return {
            profileId: this._profileId.getValue(),
            userId: this._userId.getValue(),
            userName: this._userName.getValue(),
            imageUrl: this._imageUrl.getValue(),
            introduction: this._introduction.getValue(),
            url: this._url.getValue(),
        };
    }

    // ゲッターメソッド
    public get profileId(): ProfileId {
        return this._profileId;
    }

    public get userId(): UserId {
        return this._userId;
    }

    public get userName(): UserName {
        return this._userName;
    }

    public get imageUrl(): ImageUrl {
        return this._imageUrl;
    }

    public get introduction(): Introduction {
        return this._introduction;
    }

    public get url(): ProfileUrl {
        return this._url;
    }

    // 状態変更メソッド（不変性を保ったイミュータブルな更新）
    public updateUserName(newUserName: UserName): Profile {
        return Profile.reconstitute(
            this._profileId,
            this._userId,
            newUserName,
            this._imageUrl,
            this._introduction,
            this._url
        );
    }

    public updateImageUrl(newImageUrl: ImageUrl): Profile {
        return Profile.reconstitute(
            this._profileId,
            this._userId,
            this._userName,
            newImageUrl,
            this._introduction,
            this._url
        );
    }

    public updateIntroduction(newIntroduction: Introduction): Profile {
        return Profile.reconstitute(
            this._profileId,
            this._userId,
            this._userName,
            this._imageUrl,
            newIntroduction,
            this._url
        );
    }

    public updateProfile(
        newUserName: UserName,
        newImageUrl: ImageUrl,
        newIntroduction: Introduction,
        newUrl: ProfileUrl
    ): Profile {
        return Profile.reconstitute(
            this._profileId,
            this._userId,
            newUserName,
            newImageUrl,
            newIntroduction,
            newUrl
        );
    }

    // ドメインロジックを含むビジネスメソッド
    public isComplete(): boolean {
        // プロフィールが完全に入力されているかをチェック
        return (
            this._userName.getValue().length > 0 &&
            this._imageUrl.getValue().length > 0 &&
            this._introduction.getValue().length > 0
        );
    }

    public hasDefaultImage(): boolean {
        // デフォルト画像を使用しているかをチェック
        return this._imageUrl.getValue().includes('/default-avatar');
    }

    // 同一性の比較 (エンティティの同一性はIDに基づく)
    public equals(other?: Profile): boolean {
        if (!other) {
            return false;
        }

        return this._profileId.equals(other._profileId);
    }
}