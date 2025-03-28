export interface IStorageRepository {
  upload(params: IStorageRepositoryOptions): Promise<string>;
  download(): Promise<string>;
}
export interface IStorageRepositoryOptions {
  bucketName: string;
  fileName: string;
  filePath: string;
}
