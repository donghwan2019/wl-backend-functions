import moment from 'moment-timezone';
import { Kma } from './getKma.js';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

/**
 * ASOS 지점 일자료 조회 서비스 (AsosDalyInfoService)
 * 
 * 지상관측소의 일별 기상 관측 데이터를 제공합니다.
 * 
 * **참고 문서**: 
 * - `kma/docs/KMA_Surface_Synoptic_ASOS_Daily_Data_Inquiry_Service_OpenAPI_User_Guide.pdf`
 * 
 * **API 정보**:
 * - 서비스명: 지상(종관, ASOS) 일자료 조회서비스
 * - 서비스 URL: http://apis.data.go.kr/1360000/AsosDalyInfoService
 * - 제공 기관: 기상청
 * - 데이터 갱신 주기: 1일 1회 (익일 09시)
 * 
 * **주요 기능**:
 * - 전국 ASOS 관측소의 일별 기상 데이터 조회
 * - 기온, 강수량, 풍향풍속, 습도 등 종합 기상 정보 제공
 * - 최대 999개 지점의 데이터 동시 조회 가능
 * 
 * @class AsosDalyInfoService
 * @extends {Kma}
 * @author Weather Labs
 * @since 2024
 */
export class AsosDalyInfoService extends Kma {
    constructor() {
        super();
        
        // ASOS 일자료 조회 서비스 도메인 설정 (부모 클래스 도메인 오버라이드)
        this.domain = "http://apis.data.go.kr/1360000/AsosDalyInfoService";
        this.path = "/getWthrDataList";
        
        // 지상관측소 목록 로드
        this.stationList = null;
        this.loadStationList();
        
        // 기본 파라미터 설정
        let now = moment().tz('Asia/Seoul');
        
        // 일자료는 전일 데이터까지만 제공되므로 하루 전 날짜로 설정
        let yesterday = now.subtract(1, 'days');
        
        this.params = {
            serviceKey: process.env.DATA_GO_KR_SERVICE_KEY,
            pageNo: 1,
            numOfRows: 999,  // ASOS 일자료는 최대 999개까지 조회 가능
            dataType: 'json',
            dataCd: 'ASOS',     // 관측 자료 구분 (ASOS: 종관기상관측)
            dateCd: 'DAY',      // 날짜 구분 (DAY: 일자료)
            startDt: yesterday.format('YYYYMMDD'),  // 조회 시작 날짜
            endDt: yesterday.format('YYYYMMDD'),    // 조회 종료 날짜
            stnIds: ''          // 지점 번호 (복수 지점 시 콤마로 구분)
        };
    }

    /**
     * 지상관측소 목록을 JSON 파일에서 로드합니다.
     * 
     * @private
     */
    loadStationList() {
        try {
            const __filename = fileURLToPath(import.meta.url);
            const __dirname = dirname(__filename);
            const stationListPath = join(__dirname, 'docs', 'SynopticWeatherObservationStationList.json');
            
            const stationData = readFileSync(stationListPath, 'utf8');
            const parsedData = JSON.parse(stationData);
            
            this.stationList = parsedData.stations;
            console.log(`Loaded ${this.stationList.length} weather stations from station list`);
        } catch (error) {
            console.error('Failed to load station list:', error);
            this.stationList = [];
        }
    }

    /**
     * 지상관측소 목록을 반환합니다.
     * 
     * @returns {Array<Object>} 지상관측소 목록
     * @returns {string} returns[].stnId - 지점번호
     * @returns {string} returns[].stationName - 지점명
     * @returns {string} returns[].office - 관리관서
     * 
     * @example
     * const stations = asosDalyInfoService.getStationList();
     * console.log(stations[0]); // { stnId: "90", stationName: "속초", office: "강원지방기상청" }
     */
    getStationList() {
        if (!this.stationList) {
            this.loadStationList();
        }
        return this.stationList || [];
    }

    /**
     * 지점번호가 유효한지 확인합니다.
     * 
     * @param {string|string[]} stnIds - 지점번호 (단일 또는 배열)
     * @returns {Object} 검증 결과
     * @returns {boolean} returns.isValid - 모든 지점번호가 유효한지 여부
     * @returns {string[]} returns.validIds - 유효한 지점번호 목록
     * @returns {string[]} returns.invalidIds - 유효하지 않은 지점번호 목록
     * @returns {Array<Object>} returns.validStations - 유효한 지점 정보 목록
     * 
     * @example
     * // 단일 지점번호 검증
     * const result = asosDalyInfoService.validateStationIds("108");
     * console.log(result.isValid); // true
     * console.log(result.validStations[0]); // { stnId: "108", stationName: "서울", office: "수도권기상청" }
     * 
     * @example
     * // 여러 지점번호 검증
     * const result = asosDalyInfoService.validateStationIds(["108", "105", "999"]);
     * console.log(result.isValid); // false
     * console.log(result.validIds); // ["108", "105"]
     * console.log(result.invalidIds); // ["999"]
     */
    validateStationIds(stnIds) {
        const stationList = this.getStationList();
        const idsToCheck = Array.isArray(stnIds) ? stnIds : [stnIds];
        
        const validIds = [];
        const invalidIds = [];
        const validStations = [];
        
        for (const stnId of idsToCheck) {
            const station = stationList.find(station => station.stnId === String(stnId));
            if (station) {
                validIds.push(stnId);
                validStations.push(station);
            } else {
                invalidIds.push(stnId);
            }
        }
        
        return {
            isValid: invalidIds.length === 0,
            validIds,
            invalidIds,
            validStations
        };
    }

    /**
     * 지점번호로 지점 정보를 조회합니다.
     * 
     * @param {string} stnId - 지점번호
     * @returns {Object|null} 지점 정보 (없으면 null)
     * @returns {string} returns.stnId - 지점번호
     * @returns {string} returns.stationName - 지점명
     * @returns {string} returns.office - 관리관서
     * 
     * @example
     * const station = asosDalyInfoService.getStationById("108");
     * console.log(station); // { stnId: "108", stationName: "서울", office: "수도권기상청" }
     */
    getStationById(stnId) {
        const stationList = this.getStationList();
        return stationList.find(station => station.stnId === String(stnId)) || null;
    }

    /**
     * ASOS 지점 일자료를 조회합니다.
     * 
     * **응답 메시지 명세** (KMA_Surface_Synoptic_ASOS_Daily_Data_Inquiry_Service_OpenAPI_User_Guide.pdf 참조):
     * 
     * **기본 정보**:
     * - stnId: 지점번호 (3자리 숫자)
     * - stnNm: 지점명 (한글)
     * - tm: 일시 (YYYY-MM-DD 형식)
     * 
     * **기온 관련** (단위: ℃):
     * - avgTa: 평균기온
     * - maxTa: 최고기온
     * - maxTaHrmt: 최고기온 시각 (HHMM)
     * - minTa: 최저기온
     * - minTaHrmt: 최저기온 시각 (HHMM)
     * - avgTd: 평균이슬점온도
     * - avgTs: 평균지면온도
     * - minTg: 최저초상온도
     * 
     * **강수 관련** (단위: mm, hr):
     * - sumRn: 일강수량
     * - sumRnDur: 강수계속시간
     * - mi10MaxRn: 10분 최다강수량
     * - mi10MaxRnHrmt: 10분 최다강수량 시각
     * - hr1MaxRn: 1시간 최다강수량
     * - hr1MaxRnHrmt: 1시간 최다강수량 시각
     * - n99Rn: 결측강수량
     * 
     * **바람 관련** (단위: m/s, deg):
     * - avgWs: 평균풍속
     * - maxWs: 최대풍속
     * - maxWsWd: 최대풍속 풍향
     * - maxWsHrmt: 최대풍속 시각
     * - maxInsWs: 최대순간풍속
     * - maxInsWsWd: 최대순간풍속 풍향
     * - maxInsWsHrmt: 최대순간풍속 시각
     * - maxWd: 최다풍향
     * - hr24SumRws: 24시간 풍정합
     * 
     * **습도 관련** (단위: %):
     * - avgRhm: 평균상대습도
     * - minRhm: 최소상대습도
     * - minRhmHrmt: 최소상대습도 시각
     * - avgPv: 평균증기압 (hPa)
     * 
     * **기압 관련** (단위: hPa):
     * - avgPa: 평균현지기압
     * - avgPs: 평균해면기압
     * - maxPs: 최고해면기압
     * - maxPsHrmt: 최고해면기압 시각
     * - minPs: 최저해면기압
     * - minPsHrmt: 최저해면기압 시각
     * 
     * **일조/일사 관련**:
     * - ssDur: 가조시간 (hr)
     * - sumSsHr: 합계일조시간 (hr)
     * - hr1MaxIcsr: 1시간 최다일사 (MJ/m²)
     * - hr1MaxIcsrHrmt: 1시간 최다일사 시각
     * - sumGsr: 합계전천일사 (MJ/m²)
     * 
     * **적설/눈 관련** (단위: cm):
     * - ddMefs: 일최심신적설
     * - ddMefsHrmt: 일최심신적설 시각
     * - ddMes: 일최심적설
     * - ddMesHrmt: 일최심적설 시각
     * - sumDpthFhsc: 합계신적설
     * 
     * **운량 관련** (단위: 1/10):
     * - avgTca: 평균전운량
     * - avgLmac: 평균중하층운량
     * 
     * **지중온도** (단위: ℃):
     * - avgCm5Te: 평균 5cm 지중온도
     * - avgCm10Te: 평균 10cm 지중온도
     * - avgCm20Te: 평균 20cm 지중온도
     * - avgCm30Te: 평균 30cm 지중온도
     * - avgM05Te: 평균 0.5m 지중온도
     * - avgM10Te: 평균 1.0m 지중온도
     * - avgM15Te: 평균 1.5m 지중온도
     * - avgM30Te: 평균 3.0m 지중온도
     * - avgM50Te: 평균 5.0m 지중온도
     * 
     * **증발량** (단위: mm):
     * - sumLrgEv: 합계대형증발량
     * - sumSmlEv: 합계소형증발량
     * 
     * **기타**:
     * - iscs: 현상
     * - sumFogDur: 합계안개계속시간 (hr)
     * 
     * @param {Object} event - Lambda 이벤트 객체
     * @param {Object} event.queryStringParameters - 쿼리 스트링 파라미터
     * @param {string} [event.queryStringParameters.startDt] - 조회 시작 날짜 (YYYYMMDD 형식)
     * @param {string} [event.queryStringParameters.endDt] - 조회 종료 날짜 (YYYYMMDD 형식)
     * @param {string} [event.queryStringParameters.stnIds] - 지점번호 (복수 시 콤마로 구분, 예: "108,105,101")
     * @param {string} [event.queryStringParameters.numOfRows] - 요청 데이터 개수 (기본값: 999)
     * @param {string} [event.queryStringParameters.pageNo] - 페이지 번호 (기본값: 1)
     * 
     * @returns {Promise<Object>} ASOS 일자료 API 응답
     * @returns {number} returns.statusCode - HTTP 상태 코드 (200: 성공, 500: 오류)
     * @returns {Array<Object>|Object} returns.body - 응답 데이터 (성공 시 데이터 배열, 오류 시 오류 정보)
     * 
     * @example
     * // 단일 지점, 단일 날짜 조회
     * const result = await asosDalyInfoService.get({
     *   queryStringParameters: {
     *     startDt: "20241220",
     *     endDt: "20241220", 
     *     stnIds: "108"
     *   }
     * });
     * 
     * @example
     * // 여러 지점, 날짜 범위 조회
     * const result = await asosDalyInfoService.get({
     *   queryStringParameters: {
     *     startDt: "20241215",
     *     endDt: "20241220",
     *     stnIds: "108,105,101"
     *   }
     * });
     */
    async get(event) {
        this.parseEvent(event);
        
        try {
            // 지점번호 유효성 검사
            if (this.params.stnIds) {
                const stationIds = this.params.stnIds.split(',').map(id => id.trim());
                const validation = this.validateStationIds(stationIds);
                
                if (!validation.isValid) {
                    console.warn('Invalid station IDs found:', validation.invalidIds);
                    return {
                        statusCode: 400,
                        body: {
                            error: 'Invalid station IDs',
                            invalidStationIds: validation.invalidIds,
                            validStationIds: validation.validIds,
                            message: `Invalid station IDs: ${validation.invalidIds.join(', ')}. Please check the station list.`
                        }
                    };
                }
                
                // 유효한 지점번호만 사용
                this.params.stnIds = validation.validIds.join(',');
                console.log(`Validated station IDs: ${this.params.stnIds}`);
            }
            
            // 날짜 범위와 지점 목록 생성
            const dateRange = this.generateDateRange(this.params.startDt, this.params.endDt);
            const stationIds = this.params.stnIds ? this.params.stnIds.split(',') : ['all'];
            
            // 캐시에서 기존 데이터 확인
            const cachedData = await this.loadCachedData(dateRange, stationIds);
            
            // 캐시되지 않은 데이터가 있는지 확인
            const missingData = this.findMissingData(cachedData, dateRange, stationIds);
            
            if (missingData.length === 0) {
                console.log('All ASOS daily data loaded from cache');
                return { statusCode: 200, body: this.flattenCachedData(cachedData) };
            }
            
            // 누락된 데이터만 API에서 가져오기
            const newData = await this.fetchMissingData(missingData);
            
            if (newData.statusCode === 200 && newData.body.length > 0) {
                // 새로운 데이터를 일별/지점별로 분리하여 저장
                await this.saveDailyData(newData.body);
                
                // 캐시된 데이터와 새 데이터 결합
                const combinedData = this.combineData(cachedData, newData.body);
                return { statusCode: 200, body: combinedData };
            }
            
            // 캐시된 데이터만 반환 (새 데이터가 없거나 실패한 경우)
            return { statusCode: 200, body: this.flattenCachedData(cachedData) };
            
        } catch (error) {
            console.error('Error fetching ASOS daily data:', error);
            return { 
                statusCode: 500, 
                body: { 
                    error: 'Failed to fetch ASOS daily data',
                    message: error.message 
                }
            };
        }
    }

    /**
     * 특정 지점의 ASOS 일자료를 조회합니다.
     * 
     * @param {string|string[]} stnIds - 지점번호 (단일 또는 배열)
     * @param {string} [startDate] - 시작 날짜 (YYYYMMDD)
     * @param {string} [endDate] - 종료 날짜 (YYYYMMDD)
     * @returns {Promise<Object>} API 응답 데이터
     * 
     * @example
     * // 단일 지점 조회
     * const result = await asosDalyInfoService.getByStation("108", "20250720", "20250720");
     * 
     * @example
     * // 여러 지점 조회
     * const result = await asosDalyInfoService.getByStation(["108", "105"], "20250720", "20250720");
     */
    async getByStation(stnIds, startDate = null, endDate = null) {
        // 지점번호 유효성 검사
        const stationIds = Array.isArray(stnIds) ? stnIds : [stnIds];
        const validation = this.validateStationIds(stationIds);
        
        if (!validation.isValid) {
            console.warn('Invalid station IDs found in getByStation:', validation.invalidIds);
            return {
                statusCode: 400,
                body: {
                    error: 'Invalid station IDs',
                    invalidStationIds: validation.invalidIds,
                    validStationIds: validation.validIds,
                    validStations: validation.validStations,
                    message: `Invalid station IDs: ${validation.invalidIds.join(', ')}. Valid station IDs: ${validation.validIds.join(', ')}`
                }
            };
        }
        
        // 지점번호 배열을 콤마로 구분된 문자열로 변환 (유효한 지점번호만 사용)
        const stnIdsStr = validation.validIds.join(',');
        console.log(`getByStation validated station IDs: ${stnIdsStr}`);
        
        const params = {
            queryStringParameters: {
                stnIds: stnIdsStr
            }
        };
        
        if (startDate) params.queryStringParameters.startDt = startDate;
        if (endDate) params.queryStringParameters.endDt = endDate;
        
        return await this.get(params);
    }

    /**
     * 날짜 범위로 ASOS 일자료를 조회합니다.
     * 
     * @param {string} startDate - 시작 날짜 (YYYYMMDD)
     * @param {string} endDate - 종료 날짜 (YYYYMMDD)
     * @param {string|string[]} [stnIds] - 특정 지점번호 (선택사항)
     * @returns {Promise<Object>} API 응답 데이터
     * 
     * @example
     * // 모든 지점 날짜 범위 조회
     * const result = await asosDalyInfoService.getByDateRange("20250715", "20250720");
     * 
     * @example
     * // 특정 지점들 날짜 범위 조회
     * const result = await asosDalyInfoService.getByDateRange("20250715", "20250720", ["108", "105"]);
     */
    async getByDateRange(startDate, endDate, stnIds = null) {
        const params = {
            queryStringParameters: {
                startDt: startDate,
                endDt: endDate
            }
        };
        
        if (stnIds) {
            // 지점번호 유효성 검사
            const stationIds = Array.isArray(stnIds) ? stnIds : [stnIds];
            const validation = this.validateStationIds(stationIds);
            
            if (!validation.isValid) {
                console.warn('Invalid station IDs found in getByDateRange:', validation.invalidIds);
                return {
                    statusCode: 400,
                    body: {
                        error: 'Invalid station IDs',
                        invalidStationIds: validation.invalidIds,
                        validStationIds: validation.validIds,
                        validStations: validation.validStations,
                        message: `Invalid station IDs: ${validation.invalidIds.join(', ')}. Valid station IDs: ${validation.validIds.join(', ')}`
                    }
                };
            }
            
            // 유효한 지점번호만 사용
            const stnIdsStr = validation.validIds.join(',');
            params.queryStringParameters.stnIds = stnIdsStr;
            console.log(`getByDateRange validated station IDs: ${stnIdsStr}`);
        }
        
        return await this.get(params);
    }

    /**
     * 어제 날짜의 전국 ASOS 일자료를 조회합니다.
     * 
     * @returns {Promise<Object>} API 응답 데이터
     */
    async getYesterdayData() {
        const yesterday = moment().tz('Asia/Seoul').subtract(1, 'days').format('YYYYMMDD');
        return await this.getByDateRange(yesterday, yesterday);
    }

    /**
     * 최근 7일간의 ASOS 일자료를 조회합니다.
     * 
     * @param {string|string[]} [stnIds] - 특정 지점번호 (선택사항)
     * @returns {Promise<Object>} API 응답 데이터
     */
    async getWeeklyData(stnIds = null) {
        const endDate = moment().tz('Asia/Seoul').subtract(1, 'days');
        const startDate = endDate.clone().subtract(6, 'days');
        
        return await this.getByDateRange(
            startDate.format('YYYYMMDD'),
            endDate.format('YYYYMMDD'),
            stnIds
        );
    }

    /**
     * 시작일과 종료일 사이의 모든 날짜 배열을 생성합니다.
     * 
     * @param {string} startDt - 시작 날짜 (YYYYMMDD)
     * @param {string} endDt - 종료 날짜 (YYYYMMDD)
     * @returns {string[]} 날짜 배열
     */
    generateDateRange(startDt, endDt) {
        const dates = [];
        const start = moment(startDt, 'YYYYMMDD');
        const end = moment(endDt, 'YYYYMMDD');
        
        let current = start.clone();
        while (current.isSameOrBefore(end)) {
            dates.push(current.format('YYYYMMDD'));
            current.add(1, 'day');
        }
        
        return dates;
    }

    /**
     * 캐시에서 기존 데이터를 로드합니다. (동시 실행 최적화)
     * 
     * @param {string[]} dateRange - 날짜 배열
     * @param {string[]} stationIds - 지점 ID 배열
     * @returns {Promise<Object>} 캐시된 데이터 맵
     */
    async loadCachedData(dateRange, stationIds) {
        const cachedData = {};
        
        // 모든 날짜에 대해 빈 객체 초기화
        for (const date of dateRange) {
            cachedData[date] = {};
        }
        
        // 모든 캐시 로딩 작업을 동시에 실행할 Promise 배열 생성
        const loadPromises = [];
        
        for (const date of dateRange) {
            for (const stnId of stationIds) {
                const cacheKey = `asos_daily/${stnId}/${date}`;
                
                // 각 S3 로딩 작업을 Promise로 생성
                const loadPromise = this._loadFromS3(cacheKey)
                    .then(data => {
                        if (data) {
                            cachedData[date][stnId] = data;
                            console.log(`Loaded from cache: ${cacheKey}`);
                        }
                        return { date, stnId, cacheKey, success: true, data };
                    })
                    .catch(error => {
                        // 캐시에 없는 경우는 정상적인 상황
                        console.log(`Cache miss: ${cacheKey}`);
                        return { date, stnId, cacheKey, success: false, error: error.message };
                    });
                
                loadPromises.push(loadPromise);
            }
        }
        
        // 모든 S3 로딩 작업을 동시에 실행
        console.log(`Loading ${loadPromises.length} cache entries concurrently...`);
        const startTime = Date.now();
        
        await Promise.all(loadPromises);
        
        const endTime = Date.now();
        const loadTime = endTime - startTime;
        console.log(`Concurrent cache loading completed in ${loadTime}ms for ${loadPromises.length} entries`);
        
        return cachedData;
    }

    /**
     * 캐시되지 않은 데이터를 찾습니다.
     * 
     * @param {Object} cachedData - 캐시된 데이터 맵
     * @param {string[]} dateRange - 날짜 배열
     * @param {string[]} stationIds - 지점 ID 배열
     * @returns {Array} 누락된 데이터 요청 목록
     */
    findMissingData(cachedData, dateRange, stationIds) {
        const missingData = [];
        
        for (const date of dateRange) {
            const missingStations = [];
            
            for (const stnId of stationIds) {
                if (!cachedData[date] || !cachedData[date][stnId]) {
                    missingStations.push(stnId);
                }
            }
            
            if (missingStations.length > 0) {
                missingData.push({
                    date: date,
                    stationIds: missingStations
                });
            }
        }
        
        return missingData;
    }

    /**
     * 누락된 데이터를 API에서 가져옵니다.
     * 
     * @param {Array} missingData - 누락된 데이터 요청 목록
     * @returns {Promise<Object>} API 응답 데이터
     */
    async fetchMissingData(missingData) {
        const allResults = [];
        
        for (const missing of missingData) {
            // 각 날짜별로 별도 API 요청
            const tempParams = { ...this.params };
            tempParams.startDt = missing.date;
            tempParams.endDt = missing.date;
            tempParams.stnIds = missing.stationIds.join(',');
            
            // 원래 params 백업하고 임시 설정
            const originalParams = this.params;
            this.params = tempParams;
            
            try {
                console.log(`Fetching ASOS data for ${missing.date}, stations: ${tempParams.stnIds}`);
                const kmaData = await this.getKmaData();
                const result = this.parseAsosDalyData(kmaData);
                
                if (result.statusCode === 200 && result.body.length > 0) {
                    allResults.push(...result.body);
                }
            } catch (error) {
                console.error(`Error fetching data for ${missing.date}:`, error);
            } finally {
                // 원래 params 복원
                this.params = originalParams;
            }
        }
        
        return { statusCode: 200, body: allResults };
    }

    /**
     * 새로운 데이터를 일별/지점별로 분리하여 S3에 저장합니다.
     * 
     * @param {Array} data - 저장할 데이터 배열
     */
    async saveDailyData(data) {
        const dataByDateAndStation = {};
        
        // 데이터를 날짜와 지점별로 그룹화
        for (const item of data) {
            const date = moment(item.tm).format('YYYYMMDD');
            const stnId = item.stnId;
            
            if (!dataByDateAndStation[date]) {
                dataByDateAndStation[date] = {};
            }
            if (!dataByDateAndStation[date][stnId]) {
                dataByDateAndStation[date][stnId] = [];
            }
            
            dataByDateAndStation[date][stnId].push(item);
        }
        
        // 각 날짜/지점 조합별로 파일 저장
        const savePromises = [];
        for (const date in dataByDateAndStation) {
            for (const stnId in dataByDateAndStation[date]) {
                const cacheKey = `asos_daily/${stnId}/${date}`;
                const stationData = dataByDateAndStation[date][stnId];
                
                savePromises.push(
                    this._saveToS3(cacheKey, stationData)
                        .then(() => console.log(`Saved to cache: ${cacheKey} (${stationData.length} records)`))
                        .catch(error => console.error(`Failed to save: ${cacheKey}`, error))
                );
            }
        }
        
        await Promise.all(savePromises);
    }

    /**
     * 캐시된 데이터를 평면 배열로 변환하고 tm(날짜) 순으로 정렬합니다.
     * 
     * @param {Object} cachedData - 캐시된 데이터 맵
     * @returns {Array} 평면화되고 정렬된 데이터 배열
     */
    flattenCachedData(cachedData) {
        const result = [];
        
        for (const date in cachedData) {
            for (const stnId in cachedData[date]) {
                const stationData = cachedData[date][stnId];
                if (Array.isArray(stationData)) {
                    result.push(...stationData);
                } else if (stationData) {
                    result.push(stationData);
                }
            }
        }
        
        // tm(날짜) 기준으로 오름차순 정렬
        result.sort((a, b) => {
            const dateA = a.tm || '';
            const dateB = b.tm || '';
            return dateA.localeCompare(dateB);
        });
        
        console.log(`Flattened and sorted ${result.length} cached records by tm`);
        return result;
    }

    /**
     * 캐시된 데이터와 새 데이터를 결합하고 tm(날짜) 순으로 정렬합니다.
     * 
     * @param {Object} cachedData - 캐시된 데이터 맵
     * @param {Array} newData - 새로운 데이터 배열
     * @returns {Array} 결합되고 정렬된 데이터 배열
     */
    combineData(cachedData, newData) {
        const flatCachedData = this.flattenCachedData(cachedData);
        const combinedData = [...flatCachedData, ...newData];
        
        // tm(날짜) 기준으로 오름차순 정렬
        combinedData.sort((a, b) => {
            const dateA = a.tm || '';
            const dateB = b.tm || '';
            return dateA.localeCompare(dateB);
        });
        
        console.log(`Combined and sorted ${combinedData.length} records by tm (${flatCachedData.length} cached + ${newData.length} new)`);
        return combinedData;
    }

    /**
     * ASOS 일자료 API 응답 데이터를 파싱합니다.
     * 
     * @param {Object} kmaData - KMA API 응답 데이터
     * @param {Object} kmaData.header - 응답 헤더
     * @param {string} kmaData.header.resultCode - 결과 코드 ('00': 정상)
     * @param {string} kmaData.header.resultMsg - 결과 메시지
     * @param {Object} kmaData.body - 응답 본문
     * @param {number} kmaData.body.totalCount - 전체 데이터 개수
     * @param {Array} kmaData.body.items - 데이터 배열
     * @returns {Object} 파싱된 응답 데이터
     */
    parseAsosDalyData(kmaData) {
        if (!kmaData) {
            return { statusCode: 500, body: 'No response from ASOS API' };
        }

        if (kmaData.header?.resultCode !== '00') {
            console.error('ASOS API error:', kmaData.header);
            return { statusCode: 500, body: kmaData.header };
        }

        if (!kmaData.body || kmaData.body.totalCount === 0) {
            return { statusCode: 200, body: [] };
        }

        // ASOS API는 items.item 구조를 사용
        let items = kmaData.body.items?.item || [];
        if (!Array.isArray(items)) {
            items = items ? [items] : [];
        }

        // 각 아이템의 iscs(현상) 필드를 파싱하여 구조화된 데이터 추가
        items = items.map(item => {
            if (item.iscs && typeof item.iscs === 'string') {
                item.parsedWeatherPhenomena = this.parseWeatherPhenomena(item.iscs);
            }
            return item;
        });

        return { statusCode: 200, body: items };
    }

    /**
     * 현상(iscs) 문자열을 파싱하여 구조화된 기상 현상 데이터로 변환합니다.
     * 
     * **현상 코드 예시**:
     * - "{비}0005-{비}{강도2}0300-{비}{강도1}0600-{비}{강도0}0900-"
     * - "{소나기}1650-1725."
     * - "{눈}0450-0505. {눈}1043-1048."
     * - "{박무}1925-2010. {박무}2110-2235."
     * 
     * @param {string} iscsString - 원본 현상 문자열
     * @returns {Array<Object>} 파싱된 기상 현상 배열
     * @returns {string} returns[].phenomenon - 현상 종류 (비, 눈, 소나기, 박무, 안개비 등)
     * @returns {string} returns[].intensity - 강도 (강도0, 강도1, 강도2 등)
     * @returns {string} returns[].startTime - 시작 시각 (HHMM)
     * @returns {string} returns[].endTime - 종료 시각 (HHMM)
     * @returns {number} returns[].duration - 지속 시간 (분)
     * @returns {string} returns[].rawSegment - 원본 세그먼트
     * 
     * @example
     * // 입력: "{비}0620-0655. {소나기}1005-1020."
     * // 출력: [
     * //   {
     * //     phenomenon: "비",
     * //     intensity: null,
     * //     startTime: "0620",
     * //     endTime: "0655",
     * //     duration: 35,
     * //     rawSegment: "{비}0620-0655"
     * //   },
     * //   {
     * //     phenomenon: "소나기", 
     * //     intensity: null,
     * //     startTime: "1005",
     * //     endTime: "1020",
     * //     duration: 15,
     * //     rawSegment: "{소나기}1005-1020"
     * //   }
     * // ]
     */
    parseWeatherPhenomena(iscsString) {
        if (!iscsString || typeof iscsString !== 'string') {
            return [];
        }

        const phenomena = [];
        
        // 세그먼트별로 분리 (마침표로 구분)
        const segments = iscsString.split('.').filter(seg => seg.trim());
        
        for (const segment of segments) {
            // 각 세그먼트에서 개별 현상 패턴 찾기
            // 패턴: {현상}{강도?}시작시각-종료시각? 또는 {현상}{강도?}시작시각-
            const phenomenonPattern = /\{([^}]+)\}(?:\{([^}]+)\})?(\d{4})-(?:(\d{4})|)/g;
            let match;
            
            while ((match = phenomenonPattern.exec(segment)) !== null) {
                const [fullMatch, phenomenon, intensity, startTime, endTime] = match;
                
                // 지속 시간 계산
                let duration = null;
                if (startTime && endTime) {
                    const startHour = parseInt(startTime.substr(0, 2));
                    const startMin = parseInt(startTime.substr(2, 2));
                    const endHour = parseInt(endTime.substr(0, 2));
                    const endMin = parseInt(endTime.substr(2, 2));
                    
                    let totalStartMin = startHour * 60 + startMin;
                    let totalEndMin = endHour * 60 + endMin;
                    
                    // 다음 날로 넘어가는 경우 처리
                    if (totalEndMin < totalStartMin) {
                        totalEndMin += 24 * 60;
                    }
                    
                    duration = totalEndMin - totalStartMin;
                }
                
                phenomena.push({
                    phenomenon: phenomenon,
                    intensity: intensity || null,
                    startTime: startTime,
                    endTime: endTime || null,
                    duration: duration,
                    rawSegment: fullMatch
                });
            }
        }
        
        return phenomena;
    }

    /**
     * 이벤트 파라미터를 파싱하여 API 요청 파라미터를 설정합니다.
     * 
     * @param {Object} event - Lambda 이벤트 객체
     * @param {Object} event.queryStringParameters - 쿼리 스트링 파라미터
     * @param {string} [event.queryStringParameters.startDt] - 조회 시작 날짜
     * @param {string} [event.queryStringParameters.endDt] - 조회 종료 날짜
     * @param {string} [event.queryStringParameters.stnIds] - 지점번호
     * @param {string} [event.queryStringParameters.numOfRows] - 요청 데이터 개수
     * @param {string} [event.queryStringParameters.pageNo] - 페이지 번호
     */
    parseEvent(event) {
        const { queryStringParameters } = event;
        
        if (queryStringParameters) {
            const { startDt, endDt, stnIds, numOfRows, pageNo } = queryStringParameters;
            
            console.info('ASOS Daily Info Service parameters:', { startDt, endDt, stnIds, numOfRows, pageNo });
            
            if (startDt) this.params.startDt = startDt;
            if (endDt) this.params.endDt = endDt;
            if (stnIds) this.params.stnIds = stnIds;
            if (numOfRows) this.params.numOfRows = parseInt(numOfRows);
            if (pageNo) this.params.pageNo = parseInt(pageNo);
        }
    }
}