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
        return super.parseKmaData(kmaData);
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
        result.body = JSON.stringify(result.body, null, 2);

        return result;
    }
}
