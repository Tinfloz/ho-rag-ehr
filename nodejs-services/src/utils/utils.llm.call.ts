import axios from "axios";

const soapCreationPrompt = (transcript:string, date:string):string => `
Context: You are a top-notch assistant to a doctor and your job is to make SOAP medical notes from the transcription that you receive from the conversation that happened between a doctor and a patient. A SOAP note consists of the following:
- Subjective: This section captures the patient's perspective, including their chief complaint, history of present illness
- Objective: his section contains factual, measurable information gathered from the patient, such as vital signs, physical exam findings, and lab results 
- Assessment: This section summarizes the healthcare provider's interpretation of the subjective and objective information
- Plan: This section outlines the next steps in patient care, including treatment recommendations, medications, follow-up appointments
You have to respond only in the aforementioned format that is: SOAP and add this date: ${date} to the top
Objective: You have create the SOAP notes for the following transcript:
${transcript}
Format: markdown (md)
`

const conditionPrompt = (scribe: string) => {
    `
        Context: You are a top-notch co-pilot for doctors. Your job is to understand medical scribes and give
        suspected medical conditions/ disease based on your reasoning and assessment. You should only respond
        with the suspected medical condition/ disease and nothing else.
        Objective: Given the scribe: ${scribe}, analyse it and respond with only the suspected medical condition/ disease
        and nothing else.
    `
}

const createRequestPayload = (transcript:string, date:string):Record<string, any> => {
    return {
        messages:[
            {
                role:"system",
                content: "You are a top-notch medical assistant who's role is to create SOAP notes from medical transcripts."
            },
            {
                role:"user",
                content:soapCreationPrompt(transcript, date)
            }
        ],
        temperature: 0.7,
        top_p: 0.95,
        max_tokens: 12000,
        stop: null,
        stream: false,
        frequency_penalty: 0,
        presence_penalty: 0
    }
}

const createConditionPromptPayload = (scribe: string):Record<string, any> => {
    return {
        messages:[
            {
                role:"system",
                content: "You are a top-notch co-pilot for doctors. Your job is to understand medical scribes and give suspected medical conditions/ disease based on your reasoning and assessment. You should only respond with the suspected medical condition/ disease and nothing else."
            },
            {
                role:"user",
                content:conditionPrompt(scribe)
            }
        ],
       stop: null,
       stream: false,
       frequency_penalty: 0,
       presence_penalty: 0
    }
}

export const getSOAP = async (transcript:string, date:string):Promise<string> => {
    return (await axios.post(`${process.env.GPT_API}&api-key=${process.env.GPT_API_KEY}`, createRequestPayload(transcript, date)))?.data?.choices[0]?.message?.content
} 

export const getSuspectedCondition = async (scribe: string): Promise<string> => {
    return (await axios.post(`${process.env.GPT_API_REASONING}&api-key=${process.env.GPT_API_KEY_REASONING}`, createConditionPromptPayload(scribe)))?.data?.choices[0]?.message?.content
}