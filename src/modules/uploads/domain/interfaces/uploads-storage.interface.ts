export interface IUploadsStorage {
  putAudio(input: { pathname: string; contentType: string; body: Buffer }): Promise<{ url: string }>;
  createAudioUpload(input: {
    pathname: string;
    contentType: string;
    maximumSizeInBytes: number;
    validUntil: number;
  }): Promise<{ uploadUrl: string }>;
}
