import { Db, MongoClient } from "mongodb";

export const uploadToMongo = async (data:{name:string, value:number, unit: "years" | "months", condition: string}) => {
    const client = new MongoClient(process.env.MONGO_URI);
    try {
        const db:Db = client.db(process.env.PATIENT_DB);
        await db.collection(process.env.COLLECTION).insertOne(data);
    } catch (error) {
        throw {
            status:500,
            message:"Could not insert into Db"
        }
    } finally {
        await client.close();
    }
}