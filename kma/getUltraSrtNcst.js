import { Kma } from "./getKma.js";

/**
 * 초단기실황조회
 * 매시간 30분에 생성되고 10분마다 최신 정보로 업데이트
 * base_time : 0000, 0100, 0200, 0300, 0400, 0500, 0600, 0700, 0800, 0900, 1000, 1100, 1200, 1300, 1400, 1500, 1600, 1700, 1800, 1900, 2000, 2100, 2200, 2300
 * API 제공 시간(~이후) : 매시 40분이후
 */
export class UltraSrtNcst extends Kma {
    constructor() {
        super();
        this.path = "/getUltraSrtNcst";
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
        return super.parseKmaData(kmaData);
    }

    #parseEvent(event) {
        super.parseEvent(event);
    }

    async get(event) {
        try {
            this.#parseEvent(event);
        }
        catch(error) {
            return { statusCode: 400, body: error.message };
        }

        const KmaData = await this.#getKmaData();
        if (KmaData == undefined || KmaData == null) {
            return { statusCode: 500, body: 'Fail to get KMA data.' };
        }

        let result = this.#parseKmaData(KmaData);
        result.body = JSON.stringify(result.body, null, 2);
        return result;
    }
}