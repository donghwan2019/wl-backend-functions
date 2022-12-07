import { Keco } from "./keco.js";

/**
 * 시도별 실시간 측정정보 조회
 * 매시 15분 내외
 */
export class CtprvnRltmMesureDnsty extends Keco {
    constructor() {
        super();
        this.path = "/B552584/ArpltnInforInqireSvc/getCtprvnRltmMesureDnsty";
        
        //sidoName - (전국, 서울, 부산, 대구, 인천, 광주, 대전, 울산, 경기, 강원, 충북, 충남, 전북, 전남, 경북, 경남, 제주, 세종)
        this.params.sidoName = '전국';
    }

    async #getKecoData() {
        return super.getKecoData();
    }

    /**
     *  
     * @param {object} kecoData 
     * @param {string} kecoData.header.resultCode
     * @param {number} kecoData.body.totalCount - 총 데이터 수 : 636 2022.12.01 기준
     * @param {object[]} kecoData.body.items - {pm25Grade1h, pm10Value24, so2Value, pm10Grade1h, pm10Value, o3Grade, pm25Flag, khaiGrade, pm25Value, no2Flag, mangName, stationName, no2Value, so2Grade, coFlag, khaiValue, coValue, pm10Flag, sidoName, pm25Value24, no2Grade, o3Flag, pm25Grade, so2Flag, coGrade, dataTime, pm10Grade, o3Value}
     * @param {string} kecoData.body.itemsp[].dataTime - '2022-12-01 04:00'
     * @param {string} kecoData.body.itemsp[].mangName - 국가배경, 교외대기, 도시대기, 도로변대기
     * @param {string} kecoData.body.itemsp[].stationName - 국가배경, 교외대기, 도시대기, 도로변대기, 항만
     * @param {string|null} kecoData.body.itemsp[].pm25Grade1h - number or null  or - 
     * @param {string|null} kecoData.body.itemsp[].pm25Flag - null or 통신장애 or 측정불가 or 점검및교정 or 정기점검 or 자료이상
     * @returns {object} result
     */
    #parseKecoData(kecoData) {
        return super.parseKecoData(kecoData); 
    }

    /**
     * 
     * @returns {object} result
     */
    async get() {
        const kecoData = await this.#getKecoData();

        if(kecoData === undefined || kecoData === null) {
            return {statusCode: 500, body: 'No data.'};
        }

        let result = this.#parseKecoData(kecoData);
        result.body = JSON.stringify(result.body, null, 2);

        return result;
    }
}
