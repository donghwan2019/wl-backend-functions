/**
 * 
 */

import * as cheerio from 'cheerio';
import axios from 'axios';
import iconv from 'iconv-lite';

export class KmaScraper {
    
    constructor() {
        this.domain = "https://www.weather.go.kr";
    }

    /**
     * 
     * @param {*} $ 
     * @returns 
     */
    #parseASOS($) {
        let asosInfoList = {pubDate: '', asosInfo: []};

        let strAr = $('.ehead').text().split(' ');

        asosInfoList.pubDate = strAr[strAr.length - 1];

        if (asosInfoList.pubDate === ''
            || asosInfoList.pubDate === undefined
            || asosInfoList.pubDate === null
            || asosInfoList.pubDate.length < 12) {
                console.warn('Fail to get weather data.', asosInfoList.pubDate);

                return asosInfoList;
        }

        console.info('pubDate: ', asosInfoList.pubDate);

        const propertyName = ['stnId', 'stnName', 'altitude', 'rns', 'rs15m', 'rs1h', 'rs3h', 'rs6h', 'rs12h', 'rs1d', 't1h',
            'vec1', 'wdd1', 'wsd1', 'vec', 'wdd', 'wsd', 'reh', 'hPa', 'addr'];

        let table = $('table table');

        let trs = table.find('tr');
        console.info('trs: ', trs.length);

        trs.each((i, tr) => {
            if (i === 0) {
                //skip header
                return;
            }

            let tds = $(tr).find('td');

            let stnMinInfo = {};
            stnMinInfo.date = new Date(asosInfoList.pubDate);

            tds.each((j, td) => {
               let tdText = $(td).text().replace(/\s+/, '');
               tdText = tdText.replace(/(\r\n|\n|\r)/gm, '');
               tdText = tdText.replace(/\s+/g, '');

                if (tdText === '.' || tdText === '-') {
                    //skip invalid data
                    return;
                }

                let val;
                switch(propertyName[j]) {
                    case 'altitude':
                    case 'reh':
                        val = parseInt(tdText);
                        if(!isNaN(val)) {
                            stnMinInfo[propertyName[j]] = val;
                        }
                        break;
                    case 'rns':
                        stnMinInfo[propertyName[j]]  = tdText === '●' ? true: false;
                        break;
                    case 'rs15m':
                    case 'rs1h':
                    case 'rs3h':
                    case 'rs6h':
                    case 'rs12h':
                    case 'rs1d':
                    case 't1h':
                    case 'vec1':
                    case 'wsd1':
                    case 'vec':
                    case 'wsd':
                    case 'hPa':
                        val = parseFloat(tdText);
                        if (!isNaN(val)) {
                            stnMinInfo[propertyName[j]] = val;
                        }
                        break;
                    default: 
                        stnMinInfo[propertyName[j]] = tdText;
                }
            });

            if (stnMinInfo.t1h === 0
                && stnMinInfo.vec === 0
                && stnMinInfo.wsd === 0
                && stnMinInfo.vec1 === 0) {
                console.error('Invalid data. ', stnMinInfo);
            }
            else {
                // console.log(stnMinInfo);
                asosInfoList.asosInfo.push(stnMinInfo);
            }
        });

        return asosInfoList;
    }
    
    /**
     * 2022.11.22 21:30 -> 202211222130 
     * @param {*} datetime 
     * @returns 
     */
    async getASOS(datetime) {
        const url = this.domain + '/cgi-bin/aws/nph-aws_txt_min';

        console.info(url);
        
        const response = await axios.get(url, {responseEncoding: 'binary', responseType: 'arraybuffer'});
        const body = response.data;

        let result = {statusCode: 200, body: ''};

        if(body === undefined || body === null) {
            result.statusCode = 500;
            result.body = 'Fail to get ASOS data.';
            return result;
        }

        try {
            const strContents = iconv.decode(body, 'euc-kr').toString();
            let $ = cheerio.load(strContents);

            result.body = this.#parseASOS($);
        }
        catch(e) {
            console.error(e);
            result.statusCode = 500;
            result.body = 'Fail to parse ASOS data.';
        }

        // console.log(`result: ${JSON.stringify(result, null, 2)}`);
        return result;
    }
}
