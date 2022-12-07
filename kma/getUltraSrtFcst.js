import { Kma } from "./getKma.js";

/**
 * 초단기예보조회
 * 매시간 30분에 생성되고 10분마다 최신 정보로 업데이트(기온, 습도, 바람)
 * base_time : 0030, 0130, 0230, 0330, 0430, 0530, 0630, 0730, 0830, 0930, 1030, 1130, 1230, 1330, 1430, 1530, 1630, 1730, 1830, 1930, 2030, 2130, 2230, 2330
 * API 제공 시간(~이후) : 매시 45분이후
 */
export class UltraSrtFcst extends Kma {
    constructor() {
        super();
        this.path = "/getUltraSrtFcst";
    }

    async #getKmaData() {
        return super.getKmaData();
    }

    /**
     * 
     * @param {object} kmaData 
     * @param {string} kmaData.body.items[].category - T1H, RN1, SKY, UUU, VVV, REH, PTY, LGT, VEC, WSD
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
     * @param {*} event 
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
