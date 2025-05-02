import { app, InvocationContext } from "@azure/functions";
import { CreateSearchSetUp } from "../utils/utils.indexer";

export async function createIndexerSkillSetIndex(queueItem: unknown, context: InvocationContext): Promise<void> {
    try {
        const {saEndPoint, patient} = queueItem as {saEndPoint:string, patient:string};
        await new CreateSearchSetUp(patient, saEndPoint, patient).setUpLlmIndexer();
        context.log("Indexer set up created!");
    } catch (error) {
        context.error(error?.message ?? error);
    }
}

app.storageQueue('createIndexerSkillSetIndex', {
    queueName: 'ai-indexer',
    connection: 'BLOB_CLIENT',
    handler: createIndexerSkillSetIndex
});
