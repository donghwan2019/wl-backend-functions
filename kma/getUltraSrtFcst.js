import moment from "moment-timezone";
import { Kma } from "./getKma.js";

/**
 * 초단기예보조회 (getUltraSrtFcst, shortest term forecast)
 * 매시간 30분에 생성되고 10분마다 최신 정보로 업데이트(기온, 습도, 바람)
 * base_time : 0030, 0130, 0230, 0330, 0430, 0530, 0630, 0730, 0830, 0930, 1030, 1130, 1230, 1330, 1430, 1530, 1630, 1730, 1830, 1930, 2030, 2130, 2230, 2330
 * API 제공 시간(~이후) : 매시 45분이후
 */
export class UltraSrtFcst extends Kma {
    constructor() {
        super();
        this.path = "/getUltraSrtFcst";

        let now = moment().tz('Asia/Seoul');
        let minute = now.minute();
        if (minute <= 45) {
            now.subtract(1, 'hours');
            this.params.base_date = now.format('YYYYMMDD');
            this.params.base_time = now.format('HH') + '30';
        }
        this.data;
        this.key = `kma/${this.params.base_date}${this.params.base_time}_${this.params.nx}_${this.params.ny}_ultraSrtFcst`;
    }

    async #getKmaData() {
        return super.getKmaData();
    }

    /**
     * 
     * @param {string} kmaData.body.items[].category - T1H, RN1, SKY, UUU, VVV, REH, PTY, LGT, VEC, WSD
     * @param {string} kmaData.body.items[].fcstDate
     * @param {string} kmaData.body.items[].fcstTime
     * @param {string} kmaData.body.items[].fcstValue
     * @returns 
     */
    #parseKmaData(kmaData) {
        let {statusCode, body} =  super.parseKmaData(kmaData);
        if (statusCode !== 200) {
            return { statusCode: statusCode, body: body };
        }

        let result = [{
            nx: this.params.nx,
            ny: this.params.ny,
            baseDate: moment(this.params.base_date + this.params.base_time, 'YYYYMMDDHHmm', "Asia/Seoul").toDate(),
            baseDateTimeStr: this.params.base_date + this.params.base_time,
        }];

        let items = [];

        body.item.forEach(element => {
            let item = items.find(item => item.fcstDate === element.fcstDate && item.fcstTime === element.fcstTime);
            if (item === undefined) {
                item = { 
                    fcstDate: moment(element.fcstDate + element.fcstTime, 'YYYYMMDDHHmm', "Asia/Seoul").toDate(),
                    fcstDateStr: element.fcstDate, 
                    fcstTimeStr: element.fcstTime, 
                    data: [] 
                };
                items.push(item);
            }
            let data = item.data.find(data => data.category === element.category);
            if (data === undefined) {
                data = { category: element.category, value: element.fcstValue };
                item.data.push(data);
            }
        });

        result[0].items = items;
        // console.log(result);
        return { statusCode: 200, body: result };
    }

    #parseEvent(event) {
        super.parseEvent(event);
    }

    /**
     * 
     * @param {*} event 
     * @returns 
     */
    async get(event) {
        try {
            this.#parseEvent(event);
            if (this.params.nx === -1) this.params.nx = 60;
            if (this.params.ny === -1) this.params.ny = 127;
            this.key = `kma/${this.params.base_date}${this.params.base_time}_${this.params.nx}_${this.params.ny}_ultraSrtFcst`;
        } 
        catch (error) {
            return { statusCode: 400, body: error.message };
        }

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

        const kmaData = await this.#getKmaData();
        if (kmaData == undefined || kmaData == null) {
            return { statusCode: 500, body: 'Fail to get KMA data.' };
        }

        let result = this.#parseKmaData(kmaData);
        await this._saveToS3(this.key, result.body);
        console.info(`save to S3: ${this.key}`);
        this.data = result.body;

        return result;
    }
}
