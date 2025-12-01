import { SSMClient, GetParameterCommand, GetParametersByPathCommand } from '@aws-sdk/client-ssm';

/**
 * Parameter Storeの値を取得・管理するためのクラス
 */
export class ParameterStoreManager {
    private ssm: SSMClient;
    private cache: Map<string, { value: string; timestamp: number }>;
    private cacheTTL: number; // キャッシュ有効期間（ミリ秒）

    /**
     * コンストラクタ
     * @param region AWSリージョン（指定しない場合は環境変数から取得）
     * @param cacheTTL キャッシュの有効期間（ミリ秒、デフォルト10分）
     */
    constructor(region?: string, cacheTTL: number = 10 * 60 * 1000) {
        this.ssm = new SSMClient({ region: region || process.env.AWS_REGION });
        this.cache = new Map();
        this.cacheTTL = cacheTTL;
    }

    /**
     * 指定したパラメータを取得
     * @param paramName パラメータ名
     * @param withDecryption 暗号化されたパラメータを復号するか
     * @param useCache キャッシュを使用するか
     * @returns パラメータの値
     */
    async getParameter(paramName: string, withDecryption = true, useCache = true): Promise<string> {
        // キャッシュをチェック
        if (useCache) {
            const cached = this.cache.get(paramName);
            const now = Date.now();
            if (cached && now - cached.timestamp < this.cacheTTL) {
                return cached.value;
            }
        }

        try {
            const response = await this.ssm.send(
                new GetParameterCommand({
                    Name: paramName,
                    WithDecryption: withDecryption,
                }),
            );

            const value = response.Parameter?.Value;
            if (!value) {
                throw new Error(`Parameter ${paramName} has no value`);
            }

            // キャッシュに保存
            if (useCache) {
                this.cache.set(paramName, {
                    value,
                    timestamp: Date.now(),
                });
            }

            return value;
        } catch (error) {
            console.log(`Error fetching parameter ${paramName}:`, error);
            throw error;
        }
    }

    /**
     * 指定したパス配下のパラメータをすべて取得
     * @param path パラメータのパス
     * @param withDecryption 暗号化されたパラメータを復号するか
     * @param useCache キャッシュを使用するか
     * @returns パラメータの名前と値のマップ
     */
    async getParametersByPath(path: string, withDecryption = true, useCache = true): Promise<Record<string, string>> {
        // パスの形式を正規化
        const normalizedPath = path.endsWith('/') ? path : `${path}/`;
        const cacheKey = `path:${normalizedPath}`;

        // キャッシュをチェック
        if (useCache) {
            const cached = this.cache.get(cacheKey);
            const now = Date.now();
            if (cached && now - cached.timestamp < this.cacheTTL) {
                return JSON.parse(cached.value);
            }
        }

        try {
            let nextToken: string | undefined;
            const result: Record<string, string> = {};

            // 結果が複数ページにわたる場合に備えて繰り返し取得
            do {
                const response = await this.ssm.send(
                    new GetParametersByPathCommand({
                        Path: normalizedPath,
                        Recursive: true,
                        WithDecryption: withDecryption,
                        NextToken: nextToken,
                    }),
                );

                // 取得した各パラメータを処理
                response.Parameters?.forEach((param) => {
                    if (param.Name && param.Value) {
                        // パス部分を取り除いてキー名として使用
                        const keyName = param.Name.replace(normalizedPath, '');
                        result[keyName] = param.Value;
                    }
                });

                nextToken = response.NextToken;
            } while (nextToken);

            // キャッシュに保存
            if (useCache) {
                this.cache.set(cacheKey, {
                    value: JSON.stringify(result),
                    timestamp: Date.now(),
                });
            }

            return result;
        } catch (error) {
            console.log(`Error fetching parameters by path ${path}:`, error);
            throw error;
        }
    }

    /**
     * 指定したパラメータを取得してJSONとして解析
     * @param paramName パラメータ名
     * @param withDecryption 暗号化されたパラメータを復号するか
     * @param useCache キャッシュを使用するか
     * @returns 解析されたJSON
     */
    async getJsonParameter<T>(paramName: string, withDecryption = true, useCache = true): Promise<T> {
        const value = await this.getParameter(paramName, withDecryption, useCache);
        try {
            return JSON.parse(value) as T;
        } catch (error) {
            throw new Error(`Parameter ${paramName} is not valid JSON`);
        }
    }

    /**
     * キャッシュを手動でクリア
     * @param paramName 特定のパラメータのキャッシュをクリアする場合はその名前
     */
    clearCache(paramName?: string): void {
        if (paramName) {
            this.cache.delete(paramName);
        } else {
            this.cache.clear();
        }
    }
}
