
import moment from "moment-timezone";
import { Kma } from "./getKma.js";

/**
 * 초단기실황조회 (getUltraSrtNcst, current term observation)
 * 매시간 30분에 생성되고 10분마다 최신 정보로 업데이트
 * base_time : 0000, 0100, 0200, 0300, 0400, 0500, 0600, 0700, 0800, 0900, 1000, 1100, 1200, 1300, 1400, 1500, 1600, 1700, 1800, 1900, 2000, 2100, 2200, 2300
 * API 제공 시간(~이후) : 매시 40분이후
 */
export class UltraSrtNcst extends Kma {
    constructor() {
        super();
        this.path = "/getUltraSrtNcst";
        
        let now = moment().tz('Asia/Seoul');
        let minute = now.minute();
        if (minute <= 40) {
            now.subtract(1, 'hours');
            this.params.base_date = now.format('YYYYMMDD');
            this.params.base_time = now.format('HH') + '00';
        }
        this.data;
        this.key = `kma/${this.params.base_date}${this.params.base_time}_${this.params.nx}_${this.params.ny}_ultraSrtNcst`;
    }

    async #getKmaData() {
        return super.getKmaData();
    }

    /**
     * 
     * @param {object} kmaData 
     * @param {string} kmaData.body.items[].category - T1H, RN1, UUU, VVV, REH, PTY, VEC, WSD
     * @param {string} kmaData.body.items[].obsrValue
     * @returns 
     */
    #parseKmaData(kmaData) {
        let {statusCode, body} = super.parseKmaData(kmaData);
         
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
            let item = items.find(item => item.fcstDate === element.baseDate && item.fcstTime === element.baseTime);

            if (item === undefined) {
                item = { 
                    fcstDate: moment(element.baseDate + element.baseTime, 'YYYYMMDDHHmm', "Asia/Seoul").toDate(),
                    fcstDateStr: element.baseDate, 
                    fcstTimeStr: element.baseTime, 
                    data: [] 
                };
                items.push(item);
            }
            let data = item.data.find(data => data.category === element.category);
            if (data === undefined) {
                data = { category: element.category, value: element.obsrValue };
                item.data.push(data);
            }
        });

        result[0].items = items;
        // console.log(items);
        return { statusCode: 200, body: result };
    }

    #parseEvent(event) {
        super.parseEvent(event);
    }

    async get(event) {
        try {
            this.#parseEvent(event);
            if (this.params.nx === -1) this.params.nx = 60;
            if (this.params.ny === -1) this.params.ny = 127;
            this.key = `kma/${this.params.base_date}${this.params.base_time}_${this.params.nx}_${this.params.ny}_ultraSrtNcst`;
        }
        catch(error) {
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

        const KmaData = await this.#getKmaData();
        if (KmaData == undefined || KmaData == null) {
            return { statusCode: 500, body: 'Fail to get KMA data.' };
        }

        let result = this.#parseKmaData(KmaData);
        console.log(`result: ${JSON.stringify(result, null, 2)}`);

        await this._saveToS3(this.key, result.body);
        console.info(`save to S3: ${this.key}`);
        this.data = result.body;
        return result;
    }
}