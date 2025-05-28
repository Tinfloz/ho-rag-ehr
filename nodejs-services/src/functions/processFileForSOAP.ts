import { app, InvocationContext, output } from "@azure/functions";
import { getSOAP } from "../utils/utils.llm.call";
import { responseObjectMaker } from "../utils/utils.err";
import { BlobServiceClient } from "@azure/storage-blob";

const blobClient = BlobServiceClient.fromConnectionString(process.env.BLOB_CLIENT);

const outputQueue = output.storageQueue({
    queueName:'ai-indexer',
    connection: 'BLOB_CLIENT'
})

const outputQueueCondition = output.storageQueue({
    queueName: 'condition-queue',
    connection: 'BLOB_CLIENT'
})

async function sendToBlob(SOAP:string, patient:string, invocationId:string, dateFile:string){
    let indexerQueuePush = false;
    const blobContainerClient = blobClient.getContainerClient(patient.toLowerCase());
    if (!await blobContainerClient.exists()){
        await blobContainerClient.createIfNotExists();
        indexerQueuePush = true;
    }
    const blockBlobClient = blobContainerClient.getBlockBlobClient(`${patient}_${invocationId}_${Date.now()}.md`);
    try {
        await blockBlobClient.upload(SOAP, Buffer.byteLength(SOAP),{
            blobHTTPHeaders:{
                blobContentType:"text/markdown"
            },
            metadata:{
                patient,
                date: dateFile
            }
        });
    } catch (error) {
        throw responseObjectMaker.getErrThrowResponseObject(500, error?.message ?? "Something went wrong while processing your SOAP file!")
    }
    return indexerQueuePush;
}

export async function processFileForSOAP(queueItem: unknown, context: InvocationContext): Promise<void> {
    try {
        context.log(queueItem);
        const {transcript, dateFile, invocationId, patient} = queueItem as {transcript:string, dateFile:string, invocationId:string, patient:string};
        const SOAP = await getSOAP(transcript, dateFile);
        if (await sendToBlob(SOAP, patient, invocationId, dateFile)){
            context.extraOutputs.set(outputQueue, JSON.stringify({
                patient:patient.toLowerCase(),
                saEndPoint:process.env.BLOB_CLIENT
            }));
            context.extraOutputs.set(outputQueueCondition, JSON.stringify({
                scribe:SOAP,
                patient
            }))
        }
        context.log("SOAP generated and uploaded to SA");
    } catch (error) {
        context.error(error);
    }
}

app.storageQueue('processFileForSOAP', {
    queueName: 'ai-rag',
    connection: 'BLOB_CLIENT',
    extraOutputs:[outputQueue, outputQueueCondition],
    handler: processFileForSOAP
});
