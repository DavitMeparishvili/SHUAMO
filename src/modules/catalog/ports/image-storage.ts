export interface ImageStoragePort {
  presignPut(input: { key: string; contentType: string }): Promise<string>;
}
