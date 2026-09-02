export interface ProfileMediaStorage {
  presignPut(input: {
    key: string;
    contentType: "image/jpeg" | "image/png" | "image/webp";
  }): Promise<string>;
}
