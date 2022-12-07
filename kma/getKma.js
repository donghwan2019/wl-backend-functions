import axios from 'axios';

export class Kma {
    constructor() {
        this.domain = "http://apis.data.go.kr/1360000/VilageFcstInfoService_2.0";
        this.path = "";
        this.params = {
            serviceKey : process.env.DATA_GO_KR_SERVICE_KEY,
            pageNo: 1,
            numOfRows : 9999,
            dataType : 'json',
            base_date : new Date().toISOString().slice(0, 10).replace(/-/g, ''),
            base_time : new Date().getHours() + '00',
            nx : 0,
            ny : 0,
        };
    }

    async getKmaData() {
        const url = this.domain + this.path;
        console.info({ url: url, params: this.params });
        const { data } = await axios.get(url, { params: this.params });
        return data?.response;
    }

    /**
     * POP | 강수확률 | %
     * PTY | 강수형태 | 코드값 { 없음(0), 비(1), 비/눈(2), 눈(3), 소나기(4), 빗방울(5), 빗방울눈날림(6), 눈날림(7) }
     * PCP | 1시간 강수량 | 범주 (1 mm)
     * REH | 습도 | %
     * SNO | 1시간 신적설 | 범주(1 cm)
     * SKY | 하늘상태 | 코드값 { 맑음(1), 구름많음(3), 흐림(4) }
     * TMP | 1시간 기온 | ℃
     * TMN | 일 최저기온 | ℃
     * TMX | 일 최고기온 | ℃
     * UUU | 풍속(동서성분) | m/s
     * VVV | 풍속(남북성분) | m/s
     * WAV | 파고 | M
     * VEC | 풍향 | deg
     * WSD | 풍속 | m/s
     * T1H | 기온 | ℃
     * RN1 | 1시간 강수량 | mm
     * LGT | 낙뢰 | kA(킬로암페어)
     * @param {object} kmaData 
     * @param {string} kmaData.header.resultCode
     * @param {number} kmaData.body.totalCount
     * @param {object[]} kmaData.body.items
     * @param {number} kmaData.body.items[].nx
     * @param {number} kmaData.body.items[].ny
     * @param {string} kmaData.body.items[].baseDate
     * @param {string} kmaData.body.items[].baseTime
     * @returns 
     */
    parseKmaData(kmaData) {
        if (kmaData.header?.resultCode !== '00') {
            return { statusCode: 500, body: kmaData.header };
        }

        if (kmaData.body?.totalCount === 0) {
            return { statusCode: 500, body: 'No data.' };
        }
        console.info(kmaData.body.items);

        return { statusCode: 200, body: kmaData.body.items };
    }

    /**
     * 
     * @param {object} event 
     * @param {object} event.queryStringParameters
     * @param {string} event.queryStringParameters.base_date
     * @param {string} event.queryStringParameters.base_time
     * @param {string} event.queryStringParameters.nx
     * @param {string} event.queryStringParameters.ny
     */
    parseEvent(event) {
        const { queryStringParameters } = event;
        const { base_date, base_time, nx, ny } = queryStringParameters;
        this.params.base_date = base_date;
        this.params.base_time = base_time;
        this.params.nx = parseInt(nx);
        this.params.ny = parseInt(ny);
    }

    /**
     * 
     * @param {*} event 
     * @returns 
     */
    async get(event) {
        return {statusCode: 500, body: 'Not implemented.'};
    }
}
