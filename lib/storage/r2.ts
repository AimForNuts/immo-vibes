import { getCloudflareContext } from "@opennextjs/cloudflare";

export type R2ObjectBody = {
  arrayBuffer(): Promise<ArrayBuffer>;
  text(): Promise<string>;
};

export type R2PutOptions = {
  customMetadata?: Record<string, string>;
  httpMetadata?: Record<string, string>;
};

export type R2BucketBinding = {
  delete(key: string): Promise<void>;
  get(key: string): Promise<R2ObjectBody | null>;
  put(
    key: string,
    value: ArrayBuffer | ArrayBufferView | ReadableStream | string,
    options?: R2PutOptions
  ): Promise<unknown>;
};

type CloudflareR2Env = {
  IMMO_SOURCES_BUCKET?: R2BucketBinding;
};

export function getSourcesBucket(): R2BucketBinding {
  const bucket = (getCloudflareContext().env as CloudflareR2Env).IMMO_SOURCES_BUCKET;
  if (!bucket) {
    throw new Error("Cloudflare R2 binding IMMO_SOURCES_BUCKET is not configured.");
  }
  return bucket;
}
