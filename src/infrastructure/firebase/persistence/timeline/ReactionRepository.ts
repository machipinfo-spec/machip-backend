import { getDbAndAuth } from '../../config/firebaseAdmin';
import { Reaction, ReactionDTO } from '../../../../domain/entities/timeline/reaction';
import { ReactionsId } from '../../../../domain/value-object/timeline/reactionId';
import { ThreadId } from '../../../../domain/value-object/timeline/threadId';
import { ResponseId } from '../../../../domain/value-object/timeline/responseId';
import { UserId } from '../../../../domain/value-object/users/UserId';
import { ReactionType } from '../../../../domain/value-object/timeline/reactionType';
import { IReactionRepository } from '../../../../domain/repositories/timeline/IReactionRepository';
import { Response } from '../../../../domain/entities/timeline/response';

export class ReactionRepository implements IReactionRepository {
    private readonly tableName = 'reactions';

    async save(reaction: Reaction): Promise<void> {
        const dto: ReactionDTO = reaction.toPrimitives();
        const record = {
            id: dto.id,
            reactionsType: dto.reactionsType,
            parentId: dto.parentId,
            createdAt: dto.createdAt,
            deleatedAt: dto.deleatedAt,
            ownerUserId: dto.ownerUserId,
        };

        const { db } = await getDbAndAuth();
        await db.collection(this.tableName).doc(dto.id).set(record);
    }

    async findById(reactionsId: string): Promise<Reaction | null> {
        const { db } = await getDbAndAuth();
        const docRef = await db.collection(this.tableName).doc(reactionsId).get();

        if (!docRef.exists) return null;
        const data = docRef.data();
        if (!data) return null;

        return this.mapToReaction(docRef.id, data);
    }

    async findByParentId(parentId: string, limit = 50): Promise<Reaction[]> {
        const { db } = await getDbAndAuth();
        const snapshot = await db
            .collection(this.tableName)
            .where('parentId', '==', parentId)
            .limit(limit)
            .get();

        return this.mapDocsToReactions(snapshot);
    }

    // async findByOwnerUserId(ownerUserId: string, limit = 50): Promise<Response[]> {
    //     const { db } = await getDbAndAuth();
    //     const snapshot = await db
    //         .collection(this.tableName)
    //         .where('ownerUserId', '==', ownerUserId)
    //         .limit(limit)
    //         .get();

    //     // Note: IReactionRepositoryの型定義ではResponse[]を返すことになっていますが、
    //     // これは恐らく誤りで、Reaction[]を返すべきです
    //     return this.mapDocsToReactions(snapshot) as any;
    // }

    async delete(reactionId: string): Promise<void> {
        const { db } = await getDbAndAuth();
        await db.collection(this.tableName).doc(reactionId).delete();
    }

    async softDelete(reactionId: string): Promise<void> {
        const { db } = await getDbAndAuth();
        await db.collection(this.tableName).doc(reactionId).update({
            deleatedAt: new Date()
        });
    }

    private mapToReaction(docId: string, data: any): Reaction {
        // parentIdがThreadIdかResponseIdか判定する必要がある
        // ここでは簡易的にプレフィックスで判定
        const parentId = data.parentId.startsWith('thread-') 
            ? ThreadId.fromExisting(data.parentId)
            : ResponseId.fromExisting(data.parentId);

        return Reaction.fromExisting(
            ReactionsId.fromExisting(docId),
            ReactionType.create(data.reactionsType),
            parentId,
            data.createdAt.toDate ? data.createdAt.toDate() : data.createdAt,
            data.deleatedAt ? (data.deleatedAt.toDate ? data.deleatedAt.toDate() : data.deleatedAt) : null,
            UserId.fromExisting(data.ownerUserId)
        );
    }

    private mapDocsToReactions(snapshot: any): Reaction[] {
        const results: Reaction[] = [];
        snapshot.forEach((doc: any) => {
            const data = doc.data();
            if (!data) return;
            results.push(this.mapToReaction(doc.id, data));
        });
        return results;
    }
}