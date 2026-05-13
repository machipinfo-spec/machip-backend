import { getDbAndAuth } from '../../config/firebaseAdmin';
import { Response, ResponseDTO } from '../../../../domain/entities/timeline/response';
import { ResponseId } from '../../../../domain/value-object/timeline/responseId';
import { ThreadId } from '../../../../domain/value-object/timeline/threadId';
import { UserId } from '../../../../domain/value-object/users/UserId';
import { ResponseText } from '../../../../domain/value-object/timeline/responseText';
import { IResponseRepository } from '../../../../domain/repositories/timeline/IResponseRepository';

export class ResponseRepository implements IResponseRepository {
    private readonly tableName = 'responses';

    async save(response: Response): Promise<void> {
        const dto: ResponseDTO = response.toPrimitives();
        const record = {
            id: dto.id,
            parentId: dto.parentId,
            createdAt: dto.createdAt,
            deleatedAt: dto.deleatedAt,
            ownerUserId: dto.ownerUserId,
            responseText: dto.responseText,
        };

        const { db } = await getDbAndAuth();
        await db.collection(this.tableName).doc(dto.id).set(record);
    }

    async delete(responseId: string): Promise<void> {
        const { db } = await getDbAndAuth();
        await db.collection(this.tableName).doc(responseId).update({
            deleatedAt: new Date(),
        });
    }

    async findById(responseId: string): Promise<Response | null> {
        const { db } = await getDbAndAuth();
        const docRef = await db.collection(this.tableName).doc(responseId).get();

        if (!docRef.exists) return null;
        const data = docRef.data();
        if (!data) return null;

        return this.mapToResponse(docRef.id, data);
    }

    async findByParentId(parentId: string, limit = 50): Promise<Response[]> {
        const { db } = await getDbAndAuth();
        const snapshot = await db
            .collection(this.tableName)
            .where('parentId', '==', parentId)
            .orderBy('createdAt', 'asc')
            .limit(limit)
            .get();

        return this.mapDocsToResponses(snapshot);
    }

    async findByOwnerUserId(ownerUserId: string, limit = 50): Promise<Response[]> {
        const { db } = await getDbAndAuth();
        const snapshot = await db
            .collection(this.tableName)
            .where('ownerUserId', '==', ownerUserId)
            .orderBy('createdAt', 'desc')
            .limit(limit)
            .get();

        return this.mapDocsToResponses(snapshot);
    }

    private mapToResponse(docId: string, data: any): Response {
        // parentIdがThreadIdかResponseIdか判定する
        // IDのプレフィックスまたは命名規則で判定
        const parentId = this.determineParentId(data.parentId);

        return Response.fromExisting(
            ResponseId.fromExisting(docId),
            parentId,
            data.createdAt.toDate ? data.createdAt.toDate() : data.createdAt,
            data.deleatedAt ? (data.deleatedAt.toDate ? data.deleatedAt.toDate() : data.deleatedAt) : null,
            UserId.fromExisting(data.ownerUserId),
            ResponseText.create(data.responseText),
        );
    }

    private determineParentId(parentIdStr: string): ThreadId | ResponseId {
        // IDの形式や命名規則に基づいて判定
        // 例: "thread-" で始まる場合はThreadId、"response-" で始まる場合はResponseId
        if (parentIdStr.startsWith('thread-') || parentIdStr.includes('thread')) {
            return ThreadId.fromExisting(parentIdStr);
        } else {
            return ResponseId.fromExisting(parentIdStr);
        }
    }

    private mapDocsToResponses(snapshot: any): Response[] {
        const results: Response[] = [];
        snapshot.forEach((doc: any) => {
            const data = doc.data();
            if (!data) return;
            results.push(this.mapToResponse(doc.id, data));
        });
        return results;
    }
}
