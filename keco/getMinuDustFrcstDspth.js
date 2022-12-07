import { Keco } from "./getKeco.js";

/**
 * 기능명 : 대기질 예보통보 조회
 * 데이터 생성 주기 : 매일 4회(5,11,17,23시), 각 시별 10분내외
 */
export class MinuDustFrcstDspth extends Keco {
    constructor() {
        super();
        this.path = "/B552584/MsrstnInfoInqireSvc/getMinuDustFrcstDspth";
    }

    async #getKecoData() {
        return super.getKecoData();
    }

    /**
     * 
     * @param {*} kecoData 
     * @param {string} kecoData.header.resultCode
     * @param {number} kecoData.body.totalCount -
     * @param {object[]} kecoData.body.items -  {dataTime, informCode, informOverall, informCause, informGrade, actionKnack, imageUrl1, imageUrl2, imageUrl3, imageUrl4, imageUrl5, imageUrl6, imageUrl7, imageUrl8, imageUrl9, informData}
     * @returns 
     */
    async #parseKecoData(kecoData) {
        return super.parseKecoData(kecoData);
    }

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