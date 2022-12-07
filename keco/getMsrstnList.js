import { Keco } from "./getKeco.js";

/**
 * 기능명 : 측정소 목록 조회
 * 데이터 생성 주기 : 측정소 추가시
 */
export class MsrstnList extends Keco {
    constructor() {
        super();
        this.path = "/B552584/MsrstnInfoInqireSvc/getMsrstnList";
    }

    async #getKecoData() {
        return super.getKecoData();
    }

    /**
     * @param {object} kecoData 
     * @param {string} kecoData.header.resultCode
     * @param {number} kecoData.body.totalCount - 총 데이터 수 : 636 2022.12.01 기준
     * @param {object[]} kecoData.body.items - {dmX, dmY, item, mangName, year, addr, stationName}
     * @param {string} kecoData.body.items[].mangName - 국가배경, 교외대기, 도시대기, 도로변대기, 항만
     * @param {string} kecoData.body.items[].item - SO2, CO, O3, NO2, PM10, PM2
     * @returns {object} result
     */
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
