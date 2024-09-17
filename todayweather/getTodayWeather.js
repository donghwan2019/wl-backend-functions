import { VilageFcst } from "../kma/getVilageFcst.js";
import { UltraSrtNcst } from "../kma/getUltraSrtNcst.js";
import { UltraSrtFcst } from "../kma/getUltraSrtFcst.js";
import { MidFcst } from "../kma/getMidFcst.js";
import { MidLandFcst } from "../kma/getMidLandFcst.js";
import { MidTa } from "../kma/getMidTa.js";
import { KakaoApi } from "../geo/getKakaoApi.js";

import moment from "moment-timezone";

export class TodayWeather {
  constructor() {
    this.vilageFcst = new VilageFcst();
    this.ultraSrtNcst = new UltraSrtNcst();
    this.ultraSrtFcst = new UltraSrtFcst();
    this.midFcst = new MidFcst();
    this.midLandFcst = new MidLandFcst();
    this.midTa = new MidTa();
    this.params = {};
  }

  async get(event) {
    await this.#_parseEvent(event);

    try {
      let [vilageFcstData, ultraSrtNcstData, ultraSrtFcstData, midFcstData, midLandFcstData, midTaData] =
        await Promise.all([
          this.vilageFcst.get({queryStringParameters: this.params}),
          this.ultraSrtNcst.get({queryStringParameters: this.params}),
          this.ultraSrtFcst.get({queryStringParameters: this.params}),
          this.midFcst.get({queryStringParameters: this.params}),
          this.midLandFcst.get({queryStringParameters: this.params}),
          this.midTa.get({queryStringParameters: this.params}),
        ]);

      if (vilageFcstData.statusCode !== 200) {
        vilageFcstData = await this.vilageFcst.get({queryStringParameters: this.params});
      }
      if (ultraSrtNcstData.statusCode !== 200) {
        ultraSrtNcstData = await this.ultraSrtNcst.get({queryStringParameters: this.params});
      }
      if (ultraSrtFcstData.statusCode !== 200) {
        ultraSrtFcstData = await this.ultraSrtFcst.get({queryStringParameters: this.params});
      }

      let result = this.#_combineData(
        vilageFcstData,
        ultraSrtNcstData,
        ultraSrtFcstData,
        midFcstData,
        midLandFcstData,
        midTaData
      );
      console.log(result);
      // return { statusCode: 200, body: JSON.stringify(result) };
      return { statusCode: 200, body: null };
    }
    catch (error) {
      console.error(error);
      return { statusCode: 500, body: "Failed to fetch weather data" };
    }
  }

  #_convertToNxNy(lat, lon) {
    // Constants for the conversion (these are specific to the Korean coordinate system)
    const RE = 6371.00877; // Earth radius in km
    const GRID = 5.0; // Grid interval in km
    const SLAT1 = 30.0; // Standard latitude 1
    const SLAT2 = 60.0; // Standard latitude 2
    const OLON = 126.0; // Origin longitude
    const OLAT = 38.0; // Origin latitude
    const XO = 43; // X-axis origin point
    const YO = 136; // Y-axis origin point

    // Conversion logic
    const DEGRAD = Math.PI / 180.0;
    const re = RE / GRID;
    const slat1 = SLAT1 * DEGRAD;
    const slat2 = SLAT2 * DEGRAD;
    const olon = OLON * DEGRAD;
    const olat = OLAT * DEGRAD;

    let sn =
      Math.tan(Math.PI * 0.25 + slat2 * 0.5) /
      Math.tan(Math.PI * 0.25 + slat1 * 0.5);
    sn = Math.log(Math.cos(slat1) / Math.cos(slat2)) / Math.log(sn);
    let sf = Math.tan(Math.PI * 0.25 + slat1 * 0.5);
    sf = (Math.pow(sf, sn) * Math.cos(slat1)) / sn;
    let ro = Math.tan(Math.PI * 0.25 + olat * 0.5);
    ro = (re * sf) / Math.pow(ro, sn);

    let ra = Math.tan(Math.PI * 0.25 + lat * DEGRAD * 0.5);
    ra = (re * sf) / Math.pow(ra, sn);
    let theta = lon * DEGRAD - olon;
    if (theta > Math.PI) theta -= 2.0 * Math.PI;
    if (theta < -Math.PI) theta += 2.0 * Math.PI;
    theta *= sn;

    let nx = Math.floor(ra * Math.sin(theta) + XO + 0.5);
    let ny = Math.floor(ro - ra * Math.cos(theta) + YO + 0.5);

    return { nx, ny };
  }

  async #_parseEvent(event) {
    if (event.queryStringParameters) {
      this.params = { ...event.queryStringParameters };
    }
    //make base_date and base_time
    // let now = moment().tz("Asia/Seoul");
    // this.params.base_date = now.format("YYYYMMDD");
    // this.params.base_time = now.format("HHmm");

    let { nx, ny } = this.#_convertToNxNy(this.params.lat, this.params.lon);

    let regionList;

    if (this.params.lat && this.params.lon) {
      //get info from lat and lon
      const kakaoApi = new KakaoApi();
      const data = await kakaoApi.byGeoCoord(this.params.lat, this.params.lon);
      console.log(data);
      regionList = data;
    }
    else if (this.params.address) {
      //get info from address
      const kakaoApi = new KakaoApi();
      const temp = await kakaoApi.byAddress(this.params.address);
      this.params.lon = temp[0].x;
      this.params.lat = temp[0].y;
      const data = await kakaoApi.byGeoCoord(this.params.lat, this.params.lon);
      console.log(data);
      regionList = data;
    }
    else {
      throw new Error(`Invalid parameters: ${JSON.stringify(this.params)}`);
    }

    //stnId, regId, address
    let stnId;
    for (let region of regionList) {
      stnId = this.midFcst.getStnId(region.region_1depth_name);
      if (stnId) break;
    }
    if (!stnId) {
      throw new Error(`Could not find stnId for regions: ${regionList.map(r => r.region_1depth_name).join(', ')}`);
    }
    this.params.stnId = stnId;

    let regId;
    for (let region of regionList) {
      regId = this.midLandFcst.getRegId(region.region_1depth_name, region.region_2depth_name);
      if (regId) break;
    }
    if (!regId) {
      throw new Error(`Could not find regId for regions: ${regionList.map(r => r.region_1depth_name).join(', ')}`);
    }
    this.params.regId = regId;

    let regIdForTa;
    for (let region of regionList) {
      regIdForTa = this.midTa.getRegId(region.region_1depth_name, region.region_2depth_name);
      if (regIdForTa) break;
    }
    if (!regIdForTa) {
      throw new Error(`Could not find regId for regions: ${regionList.map(r => r.region_1depth_name).join(', ')}`);
    }
    this.params.regIdForTa = regIdForTa;

    this.params.nx = nx;
    this.params.ny = ny;
    console.log(this.params);
  }

  #_combineData(vilageFcstData, ultraSrtNcstData, ultraSrtFcstData, midFcstData, midLandFcstData, midTaData) {
    let now = moment().tz("Asia/Seoul");
    let result = {
      baseDateTime: now.format("YYYY-MM-DD HH:mm:ss"),
      nx: this.params.nx,
      ny: this.params.ny,
      vilageFcst: vilageFcstData.body,
      ultraSrtNcst: ultraSrtNcstData.body,
      ultraSrtFcst: ultraSrtFcstData.body,
      midFcst: midFcstData.body,
      midLandFcst: midLandFcstData.body,
      midTa: midTaData.body,
    };
    return result;
  }
}
