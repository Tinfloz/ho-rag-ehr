export interface IResponse {
    success:boolean,
    message:string
}

export interface IErrorThrowResponse {
    status:number,
    jsonBody:IResponse
}

export interface IResponseOk extends IResponse {
    data:Record<string, any> | null
}

export interface IResponseObjectMaker {
    getErrThrowResponseObject (status:number, message:string):IErrorThrowResponse,
    getErrResponseObject(message:string):IResponse,
    getOkResponseObject(message:string, data?:Record<string, any>):IResponseOk
}
