import { Keco } from './getKeco.js';
import moment from 'moment-timezone';

/**
 * 기능명: 초미세먼지 주간예보 조회
 * 생성주기 : 1일 1회, 17시30분 내외
 */
export class MinuDustWeekFrcstDspth extends Keco {
    constructor() {
        super();
        this.path = "/B552584/ArpltnInforInqireSvc/getMinuDustWeekFrcstDspth";
        delete this.params.base_date;
        delete this.params.base_time;
        
        this.data;

        //if before 17:30, use yesterday's date
        let now = moment().tz('Asia/Seoul');
        if(now.hour() < 18) {
            this.params.searchDate = now.subtract(1, 'day').format('YYYY-MM-DD');
        }
        else {
            this.params.searchDate = now.format('YYYY-MM-DD');
        }

        this.key = `keco/${this.params.searchDate}_minuDustWeekFrcstDspth`;
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
        if (this.data) {
            console.info(`load from memory: ${this.key}`);
            return { statusCode: 200, body: this.data };
        }
        else {
            this.data = await this._loadFromS3(this.key);
            if (this.data) {
                console.info(`load from S3: ${this.key}`);
                return { statusCode: 200, body: this.data };
            }
        }

        let kecoData = await this.#getKecoData();
        if(kecoData === undefined || kecoData === null) {
            return {statusCode: 500, body: 'Fail to get KECO data.'};
        }
        console.info(`get from KECO: ${this.key}`);

        let result = this.#parseKecoData(kecoData);
        await this._saveToS3(this.key, result.body);
        this.data = result.body;

        return { statusCode: 200, body: result.body };
    }

    /**
     * 
     * @param {string} region_1depth_name 
     * @param {string} region_2depth_name 
     * @returns {Promise}
     */
    async getByLocation(region_1depth_name, region_2depth_name) {
        if(this.data == undefined) {
            this.data = await this._loadFromS3(this.key);
            if(this.data == undefined) {
                let kecoData = await this.#getKecoData();
                let result = this.#parseKecoData(kecoData);
                await this._saveToS3(this.key, result.body);
                console.info(`get from KECO: ${this.key}`);
                this.data = result.body;
            }
            else {
                console.info(`load from S3: ${this.key}`);
            }
        }

        // console.log(`data: ${JSON.stringify(this.data, null, 2)}`);

        let target = this.getTargetFromLocationForFrcstDspth(region_1depth_name, region_2depth_name);
        
        /**
         * this.data = [
         * {
         *   presnatnDt: "2024-09-21"
         *   gwthcnd: "[9월24일~27일] 원활한 대기..."
         *   frcstOneDt: ""
         *   frcstOneCn:  "서울 : 낮음, 인천 : 낮음, 경기북부 : 낮음, 
         *      경기남부 : 낮음, 강원영서 : 낮음, 강원영동 : 낮음, 대전 : 낮음, 
         *      세종 : 낮음, 충남 : 낮음, 충북 : 낮음, 광주 : 낮음, 전북 : 낮음, 
         *      전남 : 낮음, 부산 : 낮음, 대구 : 낮음, 울산 : 낮음, 경북 : 낮음, 
         *      경남 : 낮음, 제주 : 낮음, 신뢰도 : 높음"
         * }
         * ]
         */
        //강원영서 -> 영서, 강원영동 -> 영동
        if (target == "영서") target = "강원영서";
        else if (target == "영동") target = "강원영동";

        let result = {
            dataTime: this.data[0].presnatnDt,
            gwthcnd: this.data[0].gwthcnd,
            location: target,
            informData: []
        }

        let temp = {
            informDate: this.data[0].frcstOneDt,
            informGrade: this.getGradeFromInformGradeByTarget(this.data[0].frcstOneCn, target)
        }
        // console.info(`temp: ${JSON.stringify(temp, null, 2)}`);
        result.informData.push(temp);

        temp = {
            informDate: this.data[0].frcstTwoDt,
            informGrade: this.getGradeFromInformGradeByTarget(this.data[0].frcstTwoCn, target)
        }
        result.informData.push(temp);

        temp = {
            informDate: this.data[0].frcstThreeDt,
            informGrade: this.getGradeFromInformGradeByTarget(this.data[0].frcstThreeCn, target)
        }
        result.informData.push(temp);

        temp = {
            informDate: this.data[0].frcstFourDt,
            informGrade: this.getGradeFromInformGradeByTarget(this.data[0].frcstFourCn, target)
        }
        result.informData.push(temp);

        // console.log(`result: ${JSON.stringify(result, null, 2)}`);
        return { statusCode: 200, body: result };
    }
}
