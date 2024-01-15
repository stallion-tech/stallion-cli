import axios, { AxiosInstance, AxiosRequestHeaders } from 'axios';

export class StallionApiClient {
    private static BASE_URL = 'https://stallion-api.redhorse.tech/api/v1';

    private static INSTANCE: StallionApiClient;

    private static HEADERS = {};

    private static axiosClient: AxiosInstance;

    private static initialised = false;

    constructor() {
        if (!StallionApiClient.INSTANCE) {
            StallionApiClient.INSTANCE = this;
        }
        if (!StallionApiClient.initialised) this.createAxiosInstance();
        return StallionApiClient.INSTANCE;
    }

    getHeaders = () => {
        return { ...StallionApiClient.HEADERS };
    };

    setHeaders = (headers: any) => {
        StallionApiClient.HEADERS = { ...StallionApiClient.HEADERS, ...headers };
    };

    createAxiosInstance = () => {
        StallionApiClient.initialised = true;
        StallionApiClient.axiosClient = axios.create({
            baseURL: StallionApiClient.BASE_URL,
            headers: this.getHeaders()
        });
    };

    get = (url: string, headers?: AxiosRequestHeaders) => {
        const reqHeaders = { ...this.getHeaders(), ...headers };
        return StallionApiClient.axiosClient.get(url, { headers: reqHeaders });
    };

    post = (url: string, body: any, headers?: AxiosRequestHeaders) => {
        const reqHeaders = { ...this.getHeaders(), ...headers };
        return StallionApiClient.axiosClient.post(url, body, { headers: reqHeaders });
    };

    put = (url: string, body: any, headers?: AxiosRequestHeaders | any) => {
        const reqHeaders = { ...this.getHeaders(), ...headers };
        return StallionApiClient.axiosClient.put(url, body, { headers: reqHeaders });
    };
}
