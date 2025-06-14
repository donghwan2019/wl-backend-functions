
import moment from 'moment-timezone';
import { MidFcstInfoService } from "./MidFcstInfoService.js";

export class MidSeaFcst extends MidFcstInfoService {

  regIdList = [
    { regId: '12A10000', regName: '서해북부' },
    { regId: '12A20000', regName: '서해중부' },
    { regId: '12A30000', regName: '서해남부' },
    { regId: '12B10000', regName: '남해서부' }, 
    { regId: '12B10500', regName: '제주도'  },
    { regId: '12B20000', regName: '남해동부' },
    { regId: '12C10000', regName: '동해남부' },
    { regId: '12C20000', regName: '동해중부' },
    { regId: '12C30000', regName: '동해북부' },
    { regId: '12D00000', regName: '대화퇴'  },
    { regId: '12E00000', regName: '동중국해' },
    { regId: '12F00000', regName: '규슈'    },
    { regId: '12G00000', regName: '연해주'   },
  ];

  constructor() {
    super();
    this.path = '/getMidSeaFcst';
    this.params.regId = '12A20000'; //서해중부 
    this.data;
    this.key = `kma/${this.params.tmFc}_${this.params.regId}_midSeaFcst`;
  }

  #transformData(source, baseDate) {
    const result = [];
    for (let day = 3; day <= 10; day++) {
      const fcstDate = moment(baseDate).add(day, 'days');
      const fcstDateStr = fcstDate.tz('Asia/Seoul').format('YYYYMMDD');
      const dayData = {
        fcstDate: fcstDate.toDate(),
        fcstDateStr: fcstDateStr,
      };

      if (source[`wf${day}Am`] !== undefined) {
        dayData.wfAm = source[`wf${day}Am`];
        dayData.wfPm = source[`wf${day}Pm`];
        dayData.whAAm = source[`wh${day}AAm`];
        dayData.whAPm = source[`wh${day}APm`];
        dayData.whBAm = source[`wh${day}BAm`];
        dayData.whBPm = source[`wh${day}BPm`];
      }
      else {
        dayData.wfAm = source[`wf${day}`];
        dayData.wfPm = source[`wf${day}`];
        dayData.whAAm = source[`wh${day}A`];
        dayData.whAPm = source[`wh${day}A`];
        dayData.whBAm = source[`wh${day}B`];
        dayData.whBPm = source[`wh${day}B`];
      }
      result.push(dayData);
    }
    return result;
  }

  #parseKmaData(kmaData) {
    let { statusCode, body } = super.parseKmaData(kmaData);
    if (statusCode !== 200) {
      return { statusCode: statusCode, body: body };
    }

    let item = kmaData.body.items.item[0];
    delete item.stnId;
    let result = [{
      regId: this.params.regId,
      baseDate : moment(this.params.tmFc, 'YYYYMMDDHHmm', "Asia/Seoul").toDate(),
      tmFc: this.params.tmFc,
    }];

    let baseDate = moment(this.params.tmFc, 'YYYYMMDD', "Asia/Seoul").toDate();
    let data = this.#transformData(item, baseDate);
    result[0].data = data;

    console.info(result);
    return { statusCode: 200, body: result };
  }

  async get(event) {
    try {
      this.parseEvent(event);
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

    const kmaData = await this.getKmaData();
    if (kmaData == undefined || kmaData == null) {
      return { statusCode: 500, body: 'Fail to get KMA data.' };
    }
    console.info(`kmaData: ${JSON.stringify(kmaData, null, 2)}`);

    let result = this.#parseKmaData(kmaData);
    await this._saveToS3(this.key, result.body);
    console.info(`save to S3: ${this.key}`);
    this.data = result.body;

    return result;
  }
}