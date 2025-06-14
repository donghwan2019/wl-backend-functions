import axios from "axios";
import moment from "moment-timezone";

import { ControllerS3 } from "../aws/controllerS3.js";
import {
  GyeonggiSouth,
  GyeonggiNorth,
  GangwonYeongSeo,
  GangwonYeongDong,
} from "../data/KoreaLocationInfo.js";

/**
 * Keco에서 데이터를 가져오는 기본 클래스
 */
export class Keco extends ControllerS3 {
    constructor() {
        super();
        this.domain = "http://apis.data.go.kr";
        this.path = "";
        this.params = {
            serviceKey : process.env.DATA_GO_KR_SERVICE_KEY,
            pageNo: 1,
            numOfRows : 9999,
            returnType : 'json'
        };

        this.params.base_date = moment().tz('Asia/Seoul').format('YYYYMMDD');
        this.params.base_time = moment().tz('Asia/Seoul').format('HH00');
    }

    async getKecoData() {
        let url = this.domain + this.path;
        console.info({ url: url, params: this.params });

        const { data } = await axios.get(url, { params: this.params });
        if (data?.response == undefined) {
            console.log(`data: ${data}`);
        }

        return data?.response;
    }

    parseKecoData(kecoData) {
        if (kecoData.header?.resultCode !== '00') {
            return { statusCode: 500, body: kecoData.header };
        }

        if (kecoData.body?.totalCount === 0) {
            return { statusCode: 500, body: 'No data.' };
        }
        console.info(`kecoData.body.items length: ${kecoData.body.items.length}`);

        return { statusCode: 200, body: kecoData.body.items };
    }

    getTargetFromLocationForFrcstDspth(reg_1depth, reg_2depth) {
      // Remove '특별시', '광역시', '특별자치도', '특별자치시' from the regName if present
      const simplifiedRegName = reg_1depth
        .replace(/(특별시|광역시|특별자치도|특별자치시)/, "")
        .trim();
      let target;
      if (simplifiedRegName === "전라남도") {
        target = "전남";
      } else if (simplifiedRegName === "전라북도") {
        target = "전북";
      } else if (simplifiedRegName === "충청남충") {
        target = "충남";
      } else if (simplifiedRegName === "충청북도") {
        target = "충북";
      } else if (
        simplifiedRegName === "강원" ||
        simplifiedRegName === "강원도"
      ) {
        let reg_2depth_simple = reg_2depth.replace(/시|군/g, "");
        if (GangwonYeongSeo.includes(reg_2depth_simple)) {
          target = "영서";
        } else if (GangwonYeongDong.includes(reg_2depth_simple)) {
          target = "영동";
        } else {
          console.error(`${reg_1depth} ${reg_2depth} is not supported.`);
        }
      } else if (simplifiedRegName === "경기도") {
        const reg_2depth_simple = reg_2depth.replace(/시|군/g, "");
        if (GyeonggiSouth.includes(reg_2depth_simple)) {
          target = "경기남부";
        } else if (GyeonggiNorth.includes(reg_2depth_simple)) {
          target = "경기북부";
        } else {
          console.error(`${reg_1depth} ${reg_2depth} is not supported.`);
        }
      } else {
        target = simplifiedRegName;
      }

      console.info(`target: ${target}`);
      return target;
    }

    /**
     * 
     * @param {string} informGrade "서울 : 낮음, 인천 : 낮음, 경기북부 : 낮음,..."
     * @param {string} target  "영동"
     * @returns {string} "낮음"
     */
    getGradeFromInformGradeByTarget(informGrade, target) {
        //remove space
        informGrade = informGrade.replace(/\s/g, "");
        let grade = informGrade.split(",");
        let result = {};
        grade.forEach(item => {
          let [location, grade] = item.split(":");
          result[location] = grade;
        });
        return result[target];
    }

    /**
     * 
     * @returns 
     */
    async get() {
        return {statusCode: 500, body: 'Not implemented.'};
    }
}