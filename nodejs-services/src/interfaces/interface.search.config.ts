export interface ISearchSetUp {
    readonly patient: string;
    readonly blobStorageEndpoint: string;
    readonly container: string;
    setUpLlmIndexer(): Promise<void>;
}