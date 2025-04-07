export interface IStorageRepository {
  upload(params: IStorageRepositoryUploadOptions): Promise<string>;
  download(params: IStorageRepositoryDownloadOptions): Promise<string>;
  getImages(params: IStorageRepositoryGetImagesOptions): Promise<string[]>;
  renameFile(params: IStorageRepositoryRenameFileOptions): Promise<void>;
}
export interface IStorageRepositoryUploadOptions {
  fileName: string;
  filePath: string;
  rootFolder: string;
}

export interface IStorageRepositoryDownloadOptions {
  rootFolder: string;
  fileName: string;
}

export interface IStorageRepositoryGetImagesOptions {
  rootFolder: string;
  prefix: string;
  limit?: number;
}

export interface IStorageRepositoryRenameFileOptions {
  fileName: string;
  rootFolder: string;
  newFileName: string;
}
