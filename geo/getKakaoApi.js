import axios from 'axios';

export class KakaoApi {
    constructor() {
        this.domain = "https://dapi.kakao.com/v2/local";
        this.path = "";
        this.params = {}
        this.api_key = process.env.DAUM_API_KEY;
    }

    async byGeoCoord(lat, lon) {
        this.path = "/geo/coord2regioncode.json";
        this.params.x = lon;
        this.params.y = lat;

        const url = this.domain + this.path;
        console.info({ url: url, params: this.params });
        const { data } = await axios.get(url, { 
            params: this.params,
            headers: {
              Authorization: `KakaoAK ${this.api_key}`
            }
        });
        if (data?.meta?.total_count === 0) {
          console.error("No data found");
          throw new Error("No data found");
        }
        return data?.documents;
    }

    /**
     * 
     * @param {string} address 
     * @returns {Promise<Array>}
     */
    async byAddress(address) {
        this.path = "/search/address.json";
        this.params.query = address;

        const url = this.domain + this.path;
        console.info({ url: url, params: this.params });

        const { data } = await axios.get(url, {
          params: this.params,
          headers: {
            Authorization: `KakaoAK ${this.api_key}`
          },
        });
        if (data?.documents.length === 0) {
          console.error("No data found");
          throw new Error("No data found");
        }
        return data?.documents;
    }
}
