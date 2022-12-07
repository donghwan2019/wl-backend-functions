import axios from "axios";

/**
 * Keco에서 데이터를 가져오는 기본 클래스
 */
export class Keco {
    constructor() {
        this.domain = "http://apis.data.go.kr";
        this.path = "";
        this.params = {
            serviceKey : process.env.DATA_GO_KR_SERVICE_KEY,
            pageNo: 1,
            numOfRows : 9999,
            returnType : 'json'
        };
    }

    async getKecoData() {
        let url = this.domain + this.path;
        console.info({ url: url, params: this.params });

        const { data } = await axios.get(url, { params: this.params });
        return data?.response;
    }

    parseKecoData(kecoData) {
        if (kecoData.header?.resultCode !== '00') {
            return { statusCode: 500, body: kecoData.header };
        }

        if (kecoData.body?.totalCount === 0) {
            return { statusCode: 500, body: 'No data.' };
        }
        console.info(kecoData.body.items);

        return { statusCode: 200, body: kecoData.body.items };
    }

    /**
     * 
     * @returns 
     */
    async get() {
        return {statusCode: 500, body: 'Not implemented.'};
    }
}