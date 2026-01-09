import { APIGatewayProxyHandler, APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { v4 as uuidv4 } from 'uuid';

const s3Client = new S3Client({
    region: process.env.AWS_REGION || 'ap-northeast-1',
});

const BUCKET_NAME = process.env.IMAGE_BUCKET_NAME || 'tetra-images-poc'; // Fallback needs to be careful, usually env var is best
const CDN_DOMAIN = process.env.CDN_DOMAIN; // e.g., cdn.example.com

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type,Authorization',
    'Access-Control-Allow-Methods': 'POST,OPTIONS',
};

interface PresignedUrlRequest {
    fileName: string;
    fileType: string;
}

export const handler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
    try {
        if (!event.body) {
            return {
                statusCode: 400,
                headers: corsHeaders,
                body: JSON.stringify({ message: 'Request body is required' }),
            };
        }

        const requestBody: PresignedUrlRequest = JSON.parse(event.body);
        const { fileName, fileType } = requestBody;

        if (!fileName || !fileType) {
            return {
                statusCode: 400,
                headers: corsHeaders,
                body: JSON.stringify({ message: 'fileName and fileType are required' }),
            };
        }

        // Validate file type (Simple check)
        const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
        if (!allowedTypes.includes(fileType)) {
            return {
                statusCode: 400,
                headers: corsHeaders,
                body: JSON.stringify({ message: 'Invalid file type' }),
            };
        }

        // Generate a unique key
        // Format: uploads/{timestamp}-{uuid}-{sanitizedFileName}
        const timestamp = Date.now();
        const sanitizedFileName = fileName.replace(/[^a-zA-Z0-9.-]/g, '_');
        const key = `uploads/${timestamp}-${uuidv4()}-${sanitizedFileName}`;

        const command = new PutObjectCommand({
            Bucket: BUCKET_NAME,
            Key: key,
            ContentType: fileType,
            // ACL is usually not needed if bucket policy handles public read, or if we use CloudFront OAJ/OAC
            // For this POC, assuming bucket might be public-read or accessed via CloudFront
        });

        const uploadUrl = await getSignedUrl(s3Client, command, { expiresIn: 300 }); // 5 minutes

        const fileUrl = CDN_DOMAIN
            ? `https://${CDN_DOMAIN}/${key}`
            : `https://${BUCKET_NAME}.s3.${process.env.AWS_REGION || 'ap-northeast-1'}.amazonaws.com/${key}`;

        return {
            statusCode: 200,
            headers: corsHeaders,
            body: JSON.stringify({
                uploadUrl,
                fileUrl,
            }),
        };
    } catch (error: any) {
        console.error('Error generating presigned URL:', error);
        return {
            statusCode: 500,
            headers: corsHeaders,
            body: JSON.stringify({ message: 'Internal Server Error', error: error.message }),
        };
    }
};

export const lambdaHandler: APIGatewayProxyHandler = async (event): Promise<APIGatewayProxyResult> => {
    if (event.httpMethod === 'OPTIONS') {
        return {
            statusCode: 200,
            headers: corsHeaders,
            body: '',
        };
    }
    return handler(event);
};
