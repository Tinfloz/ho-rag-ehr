import { IErrorThrowResponse, IResponse, IResponseOk, IResponseObjectMaker } from "../interfaces/interfaces.response.object"

class ResponseObjectMaker implements IResponseObjectMaker {

    getErrThrowResponseObject (status:number, message:string):IErrorThrowResponse {
        return {
            status,
            jsonBody:{
                success:false, 
                message
            }
        }
    }

    getErrResponseObject(message:string):IResponse {
        return {
            success:false,
            message
        }
    }

    getOkResponseObject(message:string, data?:Record<string, any>):IResponseOk {
        return {
            success:true,
            message,
            data: data ?? null
        }
    }
}

export const responseObjectMaker = new ResponseObjectMaker();