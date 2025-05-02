import {
    SearchIndexerClient,
    SearchIndexClient,
    AzureKeyCredential,
    SearchIndex,
    SearchIndexer,
    SearchIndexerDataSourceConnection,
    SearchIndexerSkillset
} from "@azure/search-documents"
import { ISearchSetUp } from "../interfaces/interface.search.config";

export class CreateSearchSetUp implements ISearchSetUp {

    public readonly patient: string;
    public readonly blobStorageEndpoint: string;
    public readonly container: string;
    private readonly adminKey = process.env.ADMIN_KEY;
    private readonly endpoint = process.env.ENDPOINT;
    private readonly searchIndexerClient = new SearchIndexerClient(this.endpoint!, new AzureKeyCredential(this.adminKey!));
    private readonly searchIndexClient = new SearchIndexClient(this.endpoint!, new AzureKeyCredential(this.adminKey!));
    private readonly DATASOURCE_TYPE = "azureblob";
    private readonly dataSourceName: string;
    private readonly indexName: string;
    private readonly indexerName: string;
    private readonly skillSetName: string;

    public constructor(patient: string, blobStorageEndpoint: string, container: string) {
        this.patient = patient;
        this.blobStorageEndpoint = blobStorageEndpoint;
        this.container = container;
        this.dataSourceName = `datasource-${this.patient}`;
        this.indexName = `index-${this.patient}`;
        this.indexerName = `indexer-${this.patient}`;
        this.skillSetName = `skillset-${this.patient}`;
    }

    private async configureDataSource(): Promise<void> {
        const dataSource: SearchIndexerDataSourceConnection = {
            name: this.dataSourceName,
            type: this.DATASOURCE_TYPE,
            connectionString: this.blobStorageEndpoint,
            container: {
                name: this.container
            },
            dataDeletionDetectionPolicy: {
                "odatatype": "#Microsoft.Azure.Search.SoftDeleteColumnDeletionDetectionPolicy",
                "softDeleteColumnName": "IsDeleted",
                "softDeleteMarkerValue": "true"
            }
        }
        await this.searchIndexerClient.createOrUpdateDataSourceConnection(dataSource);
    }

    private async createIndex(): Promise<void> {
        const index: SearchIndex = {
            name: this.indexName,
            fields: [
                {
                    name: "chunk_id",
                    type: "Edm.String",
                    key: true,
                    searchable: true,
                    filterable: true,
                    sortable: true,
                    facetable: true,
                    analyzerName:"keyword"
                },
                {
                    name: "parent_id",
                    type: "Edm.String",
                    searchable: true,
                    filterable: true,
                    sortable: true,
                    facetable: true,
                    stored: true,
                    analyzerName:"keyword"
                },
                {
                    name: "content",
                    type: "Edm.String",
                    searchable: true,
                    filterable: false,
                    sortable: false,
                    facetable: false,
                    stored: true
                },
                {
                    name: "title",
                    type: "Edm.String",
                    searchable: true,
                    filterable: true,
                    sortable: true,
                    facetable: false,
                    stored: true
                },
                {
                    name: "url",
                    type: "Edm.String",
                    searchable: false,
                    filterable: true,
                    sortable: false,
                    facetable: false,
                    stored: true,
                },
                {
                    name: "filepath",
                    type: "Edm.String",
                    searchable: false,
                    filterable: false,
                    sortable: false,
                    facetable: false,
                    stored: true
                }
            ],
            similarity: {
                odatatype: "#Microsoft.Azure.Search.BM25Similarity"
            },
            semanticSearch: {
                configurations: [
                    {
                        name: "default",
                        prioritizedFields: {
                            titleField: {
                                name: "title"
                            },
                            contentFields: [
                                {
                                    name: "content"
                                }
                            ]
                        }
                    }
                ]
            }
        }
        await this.searchIndexClient.createOrUpdateIndex(index);
    }

    private async createSkillSetForIndexer(): Promise<void> {
        const skillSet: SearchIndexerSkillset = {
            name: this.skillSetName,
            skills: [
                {
                    odatatype: "#Microsoft.Skills.Text.SplitSkill",
                    name: "#1",
                    context: "/document",
                    defaultLanguageCode: "en",
                    textSplitMode: "pages",
                    maxPageLength: 6144,
                    inputs: [
                        {
                            name: "text",
                            source: "/document/content"
                        }
                    ],
                    outputs: [
                        {
                            name: "textItems",
                            targetName: "pages"
                        }
                    ]
                }
            ],
            indexProjection: {
                selectors: [
                    {
                        targetIndexName: this.indexName,
                        parentKeyFieldName: "parent_id",
                        sourceContext: "/document/pages/*",
                        mappings: [
                            {
                                name: "content",
                                source: "/document/pages/*",
                                inputs: []
                            },
                            {
                                name: "title",
                                source: "/document/metadata_storage_name",
                                inputs: []
                            },
                            {
                                name: "filepath",
                                source: "/document/metadata_storage_name",
                                inputs: []
                            },
                            {
                                "name": "url",
                                "source": "/document/metadata_storage_path",
                                "inputs": []
                            }
                        ]
                    }
                ],
                parameters: {
                    projectionMode: "skipIndexingParentDocuments"
                }
            }
        }
        await this.searchIndexerClient.createOrUpdateSkillset(skillSet);
    }

    private async createIndexer(): Promise<void> {
        const indexer: SearchIndexer = {
            name: this.indexerName,
            dataSourceName: this.dataSourceName,
            skillsetName: this.skillSetName,
            targetIndexName: this.indexName,
            isDisabled: false,
            schedule: {
                interval: "PT10M"
            },
            parameters: {
                batchSize: 100,
                configuration: {
                    indexedFileNameExtensions: ".txt,.md,.html,.pdf,.docx,.pptx,.xlsx",
                    dataToExtract: "contentAndMetadata",
                    imageAction: "generateNormalizedImages",
                    allowSkillsetToReadFileData: true
                }
            },
            fieldMappings: [
                {
                    sourceFieldName: "metadata_storage_name",
                    targetFieldName: "filepath"
                }
            ]
        }
        await this.searchIndexerClient.createOrUpdateIndexer(indexer);
    }

    public async setUpLlmIndexer(): Promise<void> {
        await this.configureDataSource();
        await this.createIndex();
        await this.createSkillSetForIndexer();
        await this.createIndexer();
    }

}