import moment from "moment-timezone";

import { Keco } from "./getKeco.js";

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
        this.ctprvnRltmMesureDnsty;

        //if before 16 mins base_time, get data from before 1 hour
        let now = moment().tz('Asia/Seoul');
        if (now.minute() < 16) {
            this.params.base_time = now.subtract(1, 'hour').format('HH00');
        }

        this.key = `keco/${this.params.base_date+this.params.base_time}_ctprvnRltmMesureDnsty`;
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
        let kecoData;
        if (this.ctprvnRltmMesureDnsty !== undefined) {
            return { statusCode: 200, body: this.ctprvnRltmMesureDnsty };
        }
        else {
            kecoData = await this._loadFromS3(this.key);
            if (kecoData) {
                this.ctprvnRltmMesureDnsty = kecoData;
                return { statusCode: 200, body: kecoData };
            }
        }

        kecoData = await this.#getKecoData();

        if(kecoData === undefined || kecoData === null) {
            return {statusCode: 500, body: 'No data.'};
        }

        let result = this.#parseKecoData(kecoData);
        await this._saveToS3(this.key, result.body);
        return { statusCode: 200, body: result.body };
    }

    async getByStations(stationNameList) {
        if (this.ctprvnRltmMesureDnsty == undefined) {
            let kecoData = await this._loadFromS3(this.key);
            if (kecoData) {
                this.ctprvnRltmMesureDnsty = kecoData;
            }
            else {
                kecoData = await this.#getKecoData();
                let result = this.#parseKecoData(kecoData);
                this.ctprvnRltmMesureDnsty = result.body;
                await this._saveToS3(this.key, this.ctprvnRltmMesureDnsty);
            }
        }
        // Find stations by stationName
        let stations = this.ctprvnRltmMesureDnsty.filter(item => stationNameList.includes(item.stationName));

        // check dataTime of stations, if dataTime is older than 1 hour, retry to get data from keco
        // let now = moment().tz('Asia/Seoul');
        // let oneHourAgo = now.subtract(1, 'hour');
        // stations.forEach(station => {
        //     let dataTime = moment(station.dataTime);
        //     if (dataTime.isBefore(oneHourAgo)) {
        //         console.log(`Data for ${station.stationName} is older than 1 hour, retrying to get data from keco`);
        //     }
        // });

        if (stations.length > 0) {
            return { statusCode: 200, body: stations };
        } else {
            return { statusCode: 404, body: 'No stations found.' };
        }
    }
}
