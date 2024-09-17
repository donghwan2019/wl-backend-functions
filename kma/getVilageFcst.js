
import moment from 'moment-timezone';
import { Kma } from './getKma.js';

/**
 * 단기예보
 * Base_time : 0200, 0500, 0800, 1100, 1400, 1700, 2000, 2300 (1일 8회)
 * API 제공 시간(~이후) : 02:10, 05:10, 08:10, 11:10, 14:10, 17:10, 20:10, 23:10
 */
export class VilageFcst extends Kma {
    constructor() {
        super();
        this.path = "/getVilageFcst";
        let now = moment().tz('Asia/Seoul');
        let minute = now.minute();
        //check if the current time is before 10 minutes past the next base time
        if (minute <= 10) {
            now.subtract(1, 'hours');
        }
        //make the base time to the nearest base time of the current time
        let hour = now.hour();
        if (hour < 2) {
            now.subtract(1, 'days');
            this.params.base_time = '2300';
        }
        else if (hour < 5) {
            this.params.base_time = '0200';
        }
        else if (hour < 8) {
            this.params.base_time = '0500';
        }
        else if (hour < 11) {
            this.params.base_time = '0800';
        }
        else if (hour < 14) {
            this.params.base_time = '1100';
        }
        else if (hour < 17) {
            this.params.base_time = '1400';
        }
        else if (hour < 20) {
            this.params.base_time = '1700';
        }
        else if (hour < 23) {
            this.params.base_time = '2000';
        }
        else {
            this.params.base_time = '2300';
        }

        this.params.base_date = now.format('YYYYMMDD');
    } 

    async #getKmaData() {
        return super.getKmaData();
    }

    /**
     * 
     * @param {string} kmaData.body.items[].category - POP, PTY, PCP, REH, SNO, SKY, TMP, TMN, TMX, UUU, VVV, WAV, VEC, WSD
     * @param {string} kmaData.body.items[].fcstDate
     * @param {string} kmaData.body.items[].fcstTime
     * @param {string} kmaData.body.items[].fcstValue
     * @returns 
     */
    #parseKmaData(kmaData) {
        let {statusCode, body}  = super.parseKmaData(kmaData);
        if (statusCode !== 200) {
            return { statusCode: statusCode, body: body };
        }
        // console.info(body.item);
        let result = {
            nx: this.params.nx,
            ny: this.params.ny,
            baseDate: moment(this.params.base_date + this.params.base_time, 'YYYYMMDDHHmm', "Asia/Seoul").toDate(),
            baseDateTimeStr: this.params.base_date + this.params.base_time,
        };

        let items = [];

        body.item.forEach(element => {
            let item = items.find(item => item.fcstDate === element.fcstDate && item.fcstTime === element.fcstTime);
            if (item === undefined) {
                item = { 
                    fcstDate : moment(element.fcstDate + element.fcstTime, 'YYYYMMDDHHmm', "Asia/Seoul").toDate(),
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

        result.items = items;
        // console.log(result);
        return { statusCode: 200, body: result };
    }

    #parseEvent(event) {
        super.parseEvent(event);
    }

    /**
     * 
     * @param {object} event 
     * @returns 
     */
    async get(event) {
        try {
            this.#parseEvent(event);
        } 
        catch (error) {
            return { statusCode: 400, body: error.message };
        }

        const kmaData = await this.#getKmaData();
        if (kmaData == undefined || kmaData == null) {
            return { statusCode: 500, body: 'Fail to get KMA data.' };
        }

        let result = this.#parseKmaData(kmaData);
        // result.body = JSON.stringify(result.body, null, 2);
        return result;
    }
}
