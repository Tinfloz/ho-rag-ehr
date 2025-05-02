import { app, HttpRequest, HttpResponseInit, InvocationContext, output } from "@azure/functions";
import { responseObjectMaker } from "../utils/utils.err";
import { ERR_MESSAGE } from "../utils/utils.err.string";

const queueConnection = output.storageQueue({
    queueName:'ai-rag',
    connection: 'BLOB_CLIENT'
})

export async function createSOAPFromTranscript(request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
    try {
        const {transcript, date, patient} = await request.json() as {transcript:string, date:string, patient:string};
        if (!transcript || !date || !patient){
            throw responseObjectMaker.getErrThrowResponseObject(400, (!transcript && !date && !patient)? "Transcript and Date missing":(!transcript?"Transcript missing!":(!date? "Date missing": "Patient name missing")));
        }
        context.extraOutputs.set(queueConnection, JSON.stringify({
            transcript,
            patient:patient.replace(/ /g,''),
            date,
            dateFile:new Date().toISOString(),
            invocationId:context.invocationId
        }))
        return {
            status:200,
            jsonBody:responseObjectMaker.getOkResponseObject("Your SOAP will be processed shortly!")
        }
    } catch (error) {
        context.error(error?.message ?? error?.jsonBody?.message ?? error);
        return {
            status:error?.status ?? 500,
            jsonBody:error?.jsonBody ?? responseObjectMaker.getErrResponseObject(ERR_MESSAGE)
        }
    }
};

app.http('createSOAPFromTranscript', {
    methods: ['POST'],
    authLevel: 'anonymous',
    extraOutputs:[queueConnection],
    handler: createSOAPFromTranscript
});
