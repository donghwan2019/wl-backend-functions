import { Keco } from "./getKeco.js";

/**
 * 기능명 : 측정소 목록 조회
 * 데이터 생성 주기 : 측정소 추가시
 */
export class MsrstnList extends Keco {
  constructor() {
    super();
    this.path = "/B552584/MsrstnInfoInqireSvc/getMsrstnList";
    this.msrstnList;
  }

  async #getKecoData() {
    return super.getKecoData();
  }

  /**
   * @param {object} kecoData
   * @param {string} kecoData.header.resultCode
   * @param {number} kecoData.body.totalCount - 총 데이터 수 : 636 2022.12.01 기준
   * @param {object[]} kecoData.body.items - {dmX, dmY, item, mangName, year, addr, stationName}
   * @param {string} kecoData.body.items[].mangName - 국가배경, 교외대기, 도시대기, 도로변대기, 항만
   * @param {string} kecoData.body.items[].item - SO2, CO, O3, NO2, PM10, PM2
   * @returns {object} result
   */
  #parseKecoData(kecoData) {
    return super.parseKecoData(kecoData);
  }

  /**
   *
   * @returns {Promise}
   */
  async get() {
    let kecoData;
    let key;
    if (this.msrstnList !== undefined) {
      return { statusCode: 200, body: this.msrstnList };
    } else {
      key = `keco/${this.params.base_date}_msrstnList`;
      kecoData = await this._loadFromS3(key);
      console.log(kecoData);
      if (kecoData) {
        return { statusCode: 200, body: kecoData };
      }
    }

    kecoData = await this.#getKecoData();

    if (kecoData === undefined || kecoData === null) {
      return { statusCode: 500, body: "Fail to get KECO data." };
    }

    let result = this.#parseKecoData(kecoData);

    key = `keco/${this.params.base_date}_msrstnList`;
    await this._saveToS3(key, result.body);
    return result;
  }

  // 두 좌표 간의 거리를 계산하는 함수 (Haversine 공식 사용)
  getDistance(lat1, lng1, lat2, lng2) {
    function toRadians(degree) {
      return degree * (Math.PI / 180);
    }

    const R = 6371; // 지구 반지름(km)
    const dLat = toRadians(lat2 - lat1);
    const dLng = toRadians(lng2 - lng1);

    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(toRadians(lat1)) *
        Math.cos(toRadians(lat2)) *
        Math.sin(dLng / 2) *
        Math.sin(dLng / 2);

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const distance = R * c;

    return distance; // 거리(km)
  }

  //get with location
  async getStnInfo(lon, lat, mangName) {
    if (this.msrstnList === undefined) {
      let key = `keco/${this.params.base_date}_msrstnList`;
      this.msrstnList = await this._loadFromS3(key);

      //if not found get from keco
      if (this.msrstnList == null) {
        const kecoData = await this.#getKecoData();
        let result = this.#parseKecoData(kecoData);
        key = `keco/${this.params.base_date}_msrstnList`;
        await this._saveToS3(key, result.body);
        this.msrstnList = result.body;
      }
    }

    //msrstnList에서 lon과 lat에서 가장 가까운 측정소를 찾는다.
    let minDistance = Infinity;
    let closestStation = null;

    this.msrstnList.forEach((station) => {
      if (typeof station.dmX === "string")
        station.dmX = parseFloat(station.dmX);
      if (typeof station.dmY === "string")
        station.dmY = parseFloat(station.dmY);

      if (isNaN(station.dmX) || isNaN(station.dmY)) {
        console.log(
          `Invalid coordinates for station at index ${index}: dmX=${station.dmX}, dmY=${station.dmY}`
        );
        return; // skip this station
      }

      const distance = this.getDistance(lat, lon, station.dmX, station.dmY);

      if (distance < minDistance) {
        minDistance = distance;
        closestStation = station;
      }
    });

    console.log(`station: ${JSON.stringify(closestStation, null, 2)}`);
    return closestStation;
  }

  async getNearStnList(lon, lat) {
    console.log(`getNearStnList: lon=${lon}, lat=${lat}`);
    if (this.msrstnList === undefined) {
      let key = `keco/${this.params.base_date}_msrstnList`;
      this.msrstnList = await this._loadFromS3(key);

      if (this.msrstnList == null) {
        const kecoData = await this.#getKecoData();
        let result = this.#parseKecoData(kecoData);
        key = `keco/${this.params.base_date}_msrstnList`;
        await this._saveToS3(key, result.body);
        this.msrstnList = result.body;
      }
    }

    let stations = this.msrstnList.map(station => ({
      ...station,
      distance: this.getDistance(lat, lon, parseFloat(station.dmX), parseFloat(station.dmY))
    }));

    // 도시대기 측정소 중 가장 가까운 1개
    let urbanStation = stations
      .filter(station => station.mangName === "도시대기")
      .sort((a, b) => a.distance - b.distance)[0];

    console.log(`urbanStation: ${JSON.stringify(urbanStation, null, 2)}`);

    // 나머지 모든 측정소 중 가장 가까운 2개
    let otherStations = stations
      .filter(station => station !== urbanStation)
      .sort((a, b) => a.distance - b.distance)
      .slice(0, 2);

    // console.log(`otherStations: ${JSON.stringify(otherStations, null, 2)}`);

    return [urbanStation, ...otherStations];
  }
}
