// ProfileRepository.ts (インフラ層の実装)

import { UserId } from '../../../../domain/value-object/users/UserId';
import { UserName } from '../../../../domain/value-object/users/UserName';
import { ImageUrl } from '../../../../domain/value-object/users/ImageUrl';
import { getDbAndAuth } from '../../config/firebaseAdmin';
import { IProfileRepository } from '../../../../domain/repositories/profile/IProfileRepository.ts';
import { Profile } from '../../../../domain/entities/profile/profile';
import { Introduction } from '../../../../domain/value-object/profile/Introduction';
import { ProfileId } from '../../../../domain/value-object/profile/ProfileId';
import { url } from 'inspector';
import { ProfileUrl } from '../../../../domain/value-object/profile/ProfileUrl';

export class ProfileRepository implements IProfileRepository {
    private readonly tableName = 'Profiles';

    /**
     * プロフィールを保存する
     */
    async save(profile: Profile): Promise<void> {
        const record = {
            profileId: profile.profileId.getValue(),
            userId: profile.userId.getValue(),
            userName: profile.userName.getValue(),
            imageUrl: profile.imageUrl.getValue(),
            introduction: profile.introduction.getValue(),
            createdAt: new Date(),
            updatedAt: new Date(),
            url: profile.url.getValue(),
            deletedAt: null,
        };

        const { db } = await getDbAndAuth();
        await db.collection(this.tableName).add(record);
    }

    /**
     * プロフィールを更新する
     */
    async update(profile: Profile): Promise<void> {
        const { db } = await getDbAndAuth();

        // profileIdで該当ドキュメントを検索
        const query = db
            .collection(this.tableName)
            .where('deletedAt', '==', null)
            .where('profileId', '==', profile.profileId.getValue());

        const querySnapshot = await query.get();

        if (querySnapshot.empty) {
            throw new Error(`Profile not found: ${profile.profileId.getValue()}`);
        }

        const docId = querySnapshot.docs[0].id;

        const updateData = {
            userName: profile.userName.getValue(),
            imageUrl: profile.imageUrl.getValue(),
            introduction: profile.introduction.getValue(),
            updatedAt: new Date(),
            url: profile.url.getValue(),
        };

        await db.collection(this.tableName).doc(docId).update(updateData);
    }

    /**
     * プロフィールを削除する
     */
    async delete(profile: Profile): Promise<void> {
        const { db } = await getDbAndAuth();

        const query = db
            .collection(this.tableName)
            .where('deletedAt', '==', null)
            .where('profileId', '==', profile.profileId.getValue());

        const querySnapshot = await query.get();

        if (querySnapshot.empty) {
            throw new Error(`Profile not found: ${profile.profileId.getValue()}`);
        }

        const docId = querySnapshot.docs[0].id;
        await db.collection(this.tableName).doc(docId).delete();
    }

    /**
     * ProfileIdでプロフィールを検索する
     */
    async findByProfileId(profileId: ProfileId): Promise<Profile | null> {
        const { db } = await getDbAndAuth();

        const query = db
            .collection(this.tableName)
            .where('deletedAt', '==', null)
            .where('profileId', '==', profileId.getValue());

        const querySnapshot = await query.get();

        if (querySnapshot.empty) {
            return null;
        }

        const doc = querySnapshot.docs[0].data();
        return this.mapToProfile(doc);
    }

    /**
     * UserIdでプロフィールを検索する
     */
    async findByUserId(userId: UserId): Promise<Profile | null> {
        const { db } = await getDbAndAuth();

        const query = db
            .collection(this.tableName)
            .where('deletedAt', '==', null)
            .where('userId', '==', userId.getValue());

        const querySnapshot = await query.get();

        if (querySnapshot.empty) {
            return null;
        }

        const doc = querySnapshot.docs[0].data();
        return this.mapToProfile(doc);
    }

    async softDelete(profileId: ProfileId): Promise<void> {
        const { db } = await getDbAndAuth();

        const query = db
            .collection(this.tableName)
            .where('deletedAt', '==', null)
            .where('profileId', '==', profileId.getValue());

        const querySnapshot = await query.get();

        if (querySnapshot.empty) {
            throw new Error(`Profile not found: ${profileId.getValue()}`);
        }

        const docId = querySnapshot.docs[0].id;
        await db.collection(this.tableName).doc(docId).update({ deletedAt: new Date() });
    }

    /**
     * FirestoreのドキュメントデータをProfileエンティティにマッピングする
     */
    private mapToProfile(data: any): Profile {
        return Profile.reconstitute(
            ProfileId.fromExisting(data.profileId),
            UserId.fromExisting(data.userId),
            UserName.create(data.userName),
            ImageUrl.create(data.imageUrl),
            Introduction.create(data.introduction),
            ProfileUrl.create(data.url),
        );
    }
}
