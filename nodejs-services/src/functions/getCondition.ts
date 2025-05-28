import { app, InvocationContext } from "@azure/functions";
import { uploadToMongo } from "../utils/utils.upload";
import { getSuspectedCondition } from "../utils/utils.llm.call";

function extractAge(soapNote: string): {value:number, unit: "years" | "months"} | null {
  const ageRegex = /(\d+)\s*(?:-year-old|y\/o|-month-old|m\/o)/i;
  const match = soapNote.match(ageRegex);
  if (match) {
    const value = parseInt(match[1], 10);
    const unit = /year|y\/o/i.test(match[0]) ? 'years' : 'months';
    return { value, unit };
  }
  return null;
}

export async function getCondition(queueItem: unknown, context: InvocationContext): Promise<void> {
    try {
        const {scribe, patient} = queueItem as {scribe: string, patient: string};
        const age = extractAge(scribe);
        const condition = await getSuspectedCondition(scribe);
        await uploadToMongo({
            ...age,
            name:patient,
            condition
        })
    } catch (error) {
        context.error(error);
    }
}

app.storageQueue('getCondition', {
    queueName: 'condition-queue',
    connection: 'BLOB_CLIENT',
    handler: getCondition
});
