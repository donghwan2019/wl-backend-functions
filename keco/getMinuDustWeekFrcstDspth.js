import { Keco } from './getKeco.js';

/**
 * 기능명: 초미세먼지 주간예보 조회
 * 생성주기 : 1일 1회, 17시30분 내외
 */
export class MinuDustWeekFrcstDspth extends Keco {
    constructor() {
        this.domain = "http://apis.data.go.kr";
        this.params = {
            serviceKey: process.env.KECO_SERVICE_KEY,
            pageNo: 1,
            numOfRows: 9999,
            returnType: 'json'
        };
    }

    async #getKecoData() {
        return super.getKecoData();
    }

    #parseKecoData(kecoData) {
        return super.parseKecoData(kecoData);
    }

    /**
     * 
     * @returns {Promise}
     */
    async get() {
        let kecoData = await this.#getKecoData();

        if(kecoData === undefined || kecoData === null) {
            return {statusCode: 500, body: 'Fail to get KECO data.'};
        }

        let result = this.#parseKecoData(kecoData);
        result.body = JSON.stringify(result.body, null, 2);

        return result;
    }
}
