/**
 * Verify object exists after direct upload (R2/S3 HeadObject).
 */

import { HeadObjectCommand, type HeadObjectCommandOutput } from '@aws-sdk/client-s3';
import { S3Client, type S3ClientConfig } from '@aws-sdk/client-s3';
import { getStorageConfig } from './config';

export type HeadObjectResult = {
  contentLength: number;
  contentType?: string;
  etag?: string;
};

export async function headStorageObject(storageKey: string): Promise<HeadObjectResult | null> {
  const config = getStorageConfig();
  if (!config) return null;

  const clientConfig: S3ClientConfig = {
    region: config.region,
    endpoint: config.endpoint,
    credentials: {
      accessKeyId: config.accessKeyId,
      secretAccessKey: config.secretAccessKey,
    },
    forcePathStyle: true,
  };
  const client = new S3Client(clientConfig);

  try {
    const out: HeadObjectCommandOutput = await client.send(
      new HeadObjectCommand({ Bucket: config.bucket, Key: storageKey })
    );
    const len = out.ContentLength;
    if (len == null || len <= 0) return null;
    return {
      contentLength: len,
      contentType: out.ContentType,
      etag: out.ETag,
    };
  } catch {
    return null;
  }
}
