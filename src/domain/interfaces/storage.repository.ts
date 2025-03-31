export interface IStorageRepository {
  upload(params: IStorageRepositoryUploadOptions): Promise<string>;
  download(params: IStorageRepositoryDownloadOptions): Promise<string>;
  getImages(params: IStorageRepositoryGetImagesOptions): Promise<string[]>;
  renameFile(params: IStorageRepositoryRenameFileOptions): Promise<void>;
}
export interface IStorageRepositoryUploadOptions {
  fileName: string;
  filePath: string;
}

export interface IStorageRepositoryDownloadOptions {
  fileName: string;
}

export interface IStorageRepositoryGetImagesOptions {
  prefix: string;
  limit?: number;
}

export interface IStorageRepositoryRenameFileOptions {
  fileName: string;
  newFileName: string;
}
