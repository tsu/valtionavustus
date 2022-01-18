import axios, {AxiosResponse} from 'axios'

const errorHasResponse = (error: any) =>
  !!error.response && (typeof error.response === "object")

export default class HttpUtil {
  static get(url: string) {
    return HttpUtil.handleResponse(axios.get(url))
  }

  static post(url: string, jsonData?: any, authToken?: string) {
    const authHeader = authToken ? { Authorization: `Token ${authToken}` } : undefined
    return HttpUtil.handleResponse(axios.post(url, jsonData, {
      headers: { ...authHeader }
    }))
  }

  static put(url: string, requestData?: any, options?: any) {
    return HttpUtil.handleResponse(axios.put(url, requestData, options))
  }

  static putFile(url: string, file: string | Blob) {
    const formData = new FormData()
    formData.append('file', file)
    return HttpUtil.put(url, formData)
  }

  static delete(url: string) {
    return HttpUtil.handleResponse(axios.delete(url))
  }

  static handleResponse(httpCall: Promise<AxiosResponse<any>>) {
    return Promise.resolve(httpCall)
      .then(response => response.data)
      .catch(error => {
        if (errorHasResponse(error)) {
          const res = error.response
          throw new HttpResponseError(error.toString(), {
            status: res.status,
            statusText: res.statusText,
            data: res.data
          })
        } else {
          throw error
        }
      })
  }
}

export class HttpResponseError extends Error {
  response: any;

  constructor(message: string, response: any) {
    super(message);
    this.message = message
    this.name = "HttpResponseError"
    this.response = response
    if (!Error.captureStackTrace) {
      return;
    }
    Error.captureStackTrace(this, HttpResponseError)
  }
}
