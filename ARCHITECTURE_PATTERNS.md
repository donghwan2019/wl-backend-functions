# Architecture Patterns Documentation
## Weather Labs Backend Functions

### Table of Contents
1. [Overview](#overview)
2. [Inheritance Hierarchy Pattern](#inheritance-hierarchy-pattern)
3. [Multi-Layer Caching Strategy](#multi-layer-caching-strategy)
4. [Service Aggregation Pattern](#service-aggregation-pattern)
5. [API Gateway Pattern](#api-gateway-pattern)
6. [ETL Pipeline Pattern](#etl-pipeline-pattern)
7. [Adapter Pattern](#adapter-pattern)
8. [Circuit Breaker / Resilience Pattern](#circuit-breaker--resilience-pattern)
9. [Module Pattern](#module-pattern)
10. [Handler Factory Pattern](#handler-factory-pattern)
11. [Time-Based Strategy Pattern](#time-based-strategy-pattern)
12. [Additional Patterns](#additional-patterns)
13. [Architecture Benefits](#architecture-benefits)

---

## Overview

The Weather Labs Backend Functions implements a comprehensive set of architectural patterns to create a scalable, maintainable, and resilient weather data aggregation system. This document outlines the key patterns used and their implementation details.

## Inheritance Hierarchy Pattern

The codebase uses a **3-tier inheritance model** that provides code reuse and consistent behavior across all weather services.

### Structure
```
ControllerS3 (Base infrastructure layer)
    ↓
Kma / Keco (Domain-specific layers)
    ↓
VilageFcst / UltraSrtFcst / CtprvnRltmMesureDnsty (Concrete implementations)
```

### Implementation
```javascript
// Base infrastructure class
export class ControllerS3 {
    constructor() {
        this.bucket = 'weather-data-bucket';
        this.region = 'ap-northeast-2';
    }
    
    async _saveToS3(key, data) {
        // Common S3 operations
    }
    
    async _loadFromS3(key) {
        // Common S3 retrieval
    }
}

// Domain-specific base class
export class Kma extends ControllerS3 {
    constructor() {
        super();
        this.domain = "http://apis.data.go.kr/1360000/VilageFcstInfoService_2.0";
        this.params = {
            serviceKey: process.env.DATA_GO_KR_SERVICE_KEY,
            dataType: 'JSON',
            numOfRows: 1000
        };
    }
}

// Concrete implementation
export class VilageFcst extends Kma {
    constructor() {
        super();
        this.path = '/getVilageFcst';
        this.key = 'vilageFcst';
    }
}
```

### Benefits
- **Code Reuse**: Common S3 operations shared across all services
- **Consistency**: Uniform error handling and data transformation
- **Maintainability**: Changes to base classes automatically propagate
- **Extensibility**: Easy to add new data sources

## Multi-Layer Caching Strategy

The system implements a **3-tier caching pattern** for optimal performance and cost efficiency.

### Cache Layers
1. **Memory Cache**: Lambda instance-level caching
2. **S3 Cache**: Persistent distributed caching
3. **External API**: Fallback data source

### Implementation
```javascript
async get(event) {
    // Layer 1: Memory Cache
    if (this.data) {
        console.info(`load from memory: ${this.key}`);
        return { statusCode: 200, body: this.data };
    }
    
    // Layer 2: S3 Cache
    this.data = await this._loadFromS3(this.key);
    if (this.data) {
        console.info(`load from S3: ${this.key}`);
        return { statusCode: 200, body: this.data };
    }
    
    // Layer 3: External API
    const kmaData = await this.#getKmaData();
    const result = this.#parseKmaData(kmaData);
    
    // Cache the result
    this.data = result.body;
    await this._saveToS3(this.key, result.body);
    
    return result;
}
```

### Cache Key Strategy
```javascript
// Time-based cache keys
this.key = `kma/${this.params.base_date}${this.params.base_time}_${this.params.nx}_${this.params.ny}_vilageFcst`;

// Geographic partitioning
this.key = `keco/${datetime}_${regionCode}_airquality`;

// Service-specific TTL
const cacheConfig = {
    vilageFcst: '3 hours',
    ultraSrtNcst: '10 minutes',
    airQuality: '15 minutes'
};
```

## Service Aggregation Pattern

The `TodayWeather` class demonstrates **Composition and Orchestration** to combine multiple weather services.

### Implementation
```javascript
export class TodayWeather {
    constructor() {
        // Compose multiple weather services
        this.vilageFcst = new VilageFcst();
        this.ultraSrtNcst = new UltraSrtNcst();
        this.ultraSrtFcst = new UltraSrtFcst();
        this.midFcst = new MidFcst();
        this.midLandFcst = new MidLandFcst();
        this.midTa = new MidTa();
        this.ctpvrvnRltm = new CtprvnRltmMesureDnsty();
        this.msrStnList = new MsrstnList();
        this.minuDustFrcstDspth = new MinuDustFrcstDspth();
        this.minuDustWeekFrcstDspth = new MinuDustWeekFrcstDspth();
        this.kmaScraper = new KmaScraper();
    }
    
    async get(event) {
        // Parallel execution of multiple services
        let [vilageFcstData, ultraSrtNcstData, ultraSrtFcstData, 
             midFcstData, midLandFcstData, midTaData, ctpvrvnRltmData,
             msrStnListData, minuDustFrcstDspthData, minuDustWeekFrcstDspthData,
             asosList, nearStnList, cityWeatherList] = 
            await Promise.all([
                this.vilageFcst.get({ queryStringParameters: this.params }),
                this.ultraSrtNcst.get({ queryStringParameters: this.params }),
                this.ultraSrtFcst.get({ queryStringParameters: this.params }),
                this.midFcst.get({ queryStringParameters: this.params }),
                this.midLandFcst.get({ queryStringParameters: this.params }),
                this.midTa.get({ queryStringParameters: this.params }),
                this.ctpvrvnRltm.get({ queryStringParameters: this.params }),
                this.msrStnList.get({ queryStringParameters: this.params }),
                this.minuDustFrcstDspth.get({ queryStringParameters: this.params }),
                this.minuDustWeekFrcstDspth.get({ queryStringParameters: this.params }),
                this.kmaScraper.getASOS(),
                this.kmaScraper.getNearStnList(),
                this.kmaScraper.getCityWeather()
            ]);
        
        // Aggregate and transform data
        return this.#combineWeatherData({
            vilageFcstData,
            ultraSrtNcstData,
            ultraSrtFcstData,
            // ... other data
        });
    }
}
```

### Benefits
- **Parallel Processing**: Multiple API calls executed concurrently
- **Single Interface**: Unified access to all weather data
- **Fault Tolerance**: Individual service failures don't affect others
- **Data Fusion**: Intelligent combination of multiple data sources

## API Gateway Pattern

All external API integrations follow a **consistent interface pattern** for uniformity and maintainability.

### Implementation
```javascript
// Standardized API calling pattern
async #getKmaData() {
    const url = this.domain + this.path;
    const { data } = await axios.get(url, { 
        params: this.params,
        timeout: 10000,
        headers: {
            'User-Agent': 'WeatherLabs-API/1.0'
        }
    });
    return data?.response;
}

// Consistent error handling
#parseKmaData(kmaData) {
    if (kmaData.header?.resultCode !== '00') {
        console.error('KMA API Error:', kmaData.header);
        return { statusCode: 500, body: kmaData.header };
    }
    
    if (kmaData.body?.totalCount === 0) {
        console.warn('No data available from KMA API');
        return { statusCode: 500, body: 'No data.' };
    }
    
    return { statusCode: 200, body: kmaData.body.items };
}

// Standardized response format
#formatResponse(data) {
    return {
        statusCode: 200,
        headers: {
            'Content-Type': 'application/json',
            'Cache-Control': 'max-age=300'
        },
        body: JSON.stringify({
            success: true,
            data: data,
            timestamp: new Date().toISOString(),
            source: 'KMA'
        })
    };
}
```

## ETL Pipeline Pattern

The system follows **Extract-Transform-Load** for comprehensive data processing.

### Implementation
```javascript
async processWeatherData() {
    // EXTRACT: Fetch from multiple sources
    const rawKmaData = await this.#getKmaData();
    const rawKecoData = await this.#getKecoData();
    const scrapedData = await this.#scrapeWeatherData();
    
    // TRANSFORM: Parse and normalize
    const transformedKmaData = this.#parseKmaData(rawKmaData);
    const transformedKecoData = this.#parseKecoData(rawKecoData);
    const normalizedData = this.#normalizeDataStructure({
        weather: transformedKmaData,
        airQuality: transformedKecoData,
        additional: scrapedData
    });
    
    // Enrich with calculated fields
    const enrichedData = this.#enrichWeatherData(normalizedData);
    
    // LOAD: Cache and return
    await this._saveToS3(this.key, enrichedData);
    await this.#updateAnalyticsData(enrichedData);
    
    return { statusCode: 200, body: enrichedData };
}

// Data transformation pipeline
#enrichWeatherData(data) {
    return {
        ...data,
        heatIndex: this.#calculateHeatIndex(data.temperature, data.humidity),
        windChill: this.#calculateWindChill(data.temperature, data.windSpeed),
        uvIndex: this.#calculateUVIndex(data.location, data.timestamp),
        airQualityGrade: this.#calculateAQIGrade(data.airQuality),
        weatherGrade: this.#calculateWeatherGrade(data.conditions)
    };
}
```

## Adapter Pattern

The `KmaScraper` adapts HTML scraping results to standardized API responses.

### Implementation
```javascript
export class KmaScraper extends ControllerS3 {
    async #parseASOS($) {
        // Adapt HTML table to JSON structure
        const rows = $('table tr');
        const data = [];
        
        rows.each((i, row) => {
            const cells = $(row).find('td');
            if (cells.length >= 8) {
                data.push({
                    stationName: $(cells[0]).text().trim(),
                    temperature: this.#parseFloat($(cells[1]).text()),
                    humidity: this.#parseFloat($(cells[2]).text()),
                    windSpeed: this.#parseFloat($(cells[3]).text()),
                    windDirection: $(cells[4]).text().trim(),
                    pressure: this.#parseFloat($(cells[5]).text()),
                    precipitation: this.#parseFloat($(cells[6]).text()),
                    timestamp: this.#parseDateTime($(cells[7]).text())
                });
            }
        });
        
        return data;
    }
    
    async getASOS() {
        const response = await axios.get(this.asosUrl, {
            responseType: 'arraybuffer',
            timeout: 15000
        });
        
        // Handle EUC-KR encoding
        const html = iconv.decode(response.data, 'euc-kr');
        const $ = cheerio.load(html);
        
        // Adapt scraped data to API format
        const scrapedData = await this.#parseASOS($);
        
        // Standardize response format
        return {
            statusCode: 200,
            body: {
                success: true,
                data: scrapedData,
                source: 'KMA-SCRAPER',
                timestamp: new Date().toISOString()
            }
        };
    }
}
```

## Circuit Breaker / Resilience Pattern

Individual service failures don't cascade through the system.

### Implementation
```javascript
// Graceful degradation in aggregation service
async #handleServiceFailure(serviceName, serviceCall, retryCount = 1) {
    try {
        const result = await serviceCall();
        if (result.statusCode !== 200 && retryCount > 0) {
            console.warn(`${serviceName} failed, retrying...`);
            await this.#delay(1000); // Wait 1 second
            return await this.#handleServiceFailure(serviceName, serviceCall, retryCount - 1);
        }
        return result;
    } catch (error) {
        console.error(`${serviceName} error:`, error.message);
        return { statusCode: 500, body: null, error: error.message };
    }
}

// Service failure handling
async get(event) {
    const vilageFcstData = await this.#handleServiceFailure(
        'VilageFcst', 
        () => this.vilageFcst.get(params)
    );
    
    const ultraSrtNcstData = await this.#handleServiceFailure(
        'UltraSrtNcst', 
        () => this.ultraSrtNcst.get(params)
    );
    
    // Continue with other services even if some fail
    const response = {
        weather: vilageFcstData.statusCode === 200 ? vilageFcstData.body : null,
        current: ultraSrtNcstData.statusCode === 200 ? ultraSrtNcstData.body : null,
        status: {
            weather: vilageFcstData.statusCode === 200 ? 'success' : 'failed',
            current: ultraSrtNcstData.statusCode === 200 ? 'success' : 'failed'
        }
    };
    
    return { statusCode: 200, body: response };
}
```

## Module Pattern

Each domain is organized as a **self-contained module** with clear boundaries.

### Structure
```
kma/                           # Weather module
├── handler.js                 # Lambda entry points
├── getKma.js                 # Base class
├── getVilageFcst.js          # Village forecasts
├── getUltraSrtFcst.js        # Ultra short-term forecasts
├── getUltraSrtNcst.js        # Current conditions
├── getMidFcst.js             # Medium-term forecasts
├── getMidLandFcst.js         # Land forecasts
├── getMidTa.js               # Temperature forecasts
├── getMidSeaFcst.js          # Sea forecasts
└── MidFcstInfoService.js     # Utility functions

keco/                          # Air quality module
├── handler.js
├── getKeco.js                # Base class
├── getCtprvnRltmMesureDnsty.js
├── getMsrstnList.js
├── getMinuDustFrcstDspth.js
└── getMinuDustWeekFrcstDspth.js

kma-scraper/                   # Web scraping module
├── handler.js
└── kma-web-scraper.js
```

### Benefits
- **Separation of Concerns**: Each module handles one domain
- **Independent Deployment**: Modules can be deployed separately
- **Team Ownership**: Different teams can own different modules
- **Maintainability**: Clear boundaries reduce coupling

## Handler Factory Pattern

Lambda handlers act as **factories** for service instantiation.

### Implementation
```javascript
// kma/handler.js
export const vilagefcst = async (event) => {
    const vilageFcst = new VilageFcst();
    return await vilageFcst.get(event);
};

export const ultrasrtfcst = async (event) => {
    const ultraSrtFcst = new UltraSrtFcst();
    return await ultraSrtFcst.get(event);
};

export const ultrasrtncst = async (event) => {
    const ultraSrtNcst = new UltraSrtNcst();
    return await ultraSrtNcst.get(event);
};

// keco/handler.js
export const ctprvnrltmmesurednsty = async (event) => {
    const ctprvnRltmMesureDnsty = new CtprvnRltmMesureDnsty();
    return await ctprvnRltmMesureDnsty.get(event);
};

export const msrstnlist = async (event) => {
    const msrstnList = new MsrstnList();
    return await msrstnList.get(event);
};
```

## Time-Based Strategy Pattern

Services implement **intelligent time-based logic** for data freshness and API optimization.

### Implementation
```javascript
// VilageFcst - Updates every 3 hours
#setBaseTime() {
    const now = moment().tz('Asia/Seoul');
    let hour = now.hour();
    
    if (hour < 2) {
        this.params.base_time = '2300';
        this.params.base_date = now.subtract(1, 'day').format('YYYYMMDD');
    } else if (hour < 5) {
        this.params.base_time = '0200';
    } else if (hour < 8) {
        this.params.base_time = '0500';
    } else if (hour < 11) {
        this.params.base_time = '0800';
    } else if (hour < 14) {
        this.params.base_time = '1100';
    } else if (hour < 17) {
        this.params.base_time = '1400';
    } else if (hour < 20) {
        this.params.base_time = '1700';
    } else if (hour < 23) {
        this.params.base_time = '2000';
    } else {
        this.params.base_time = '2300';
    }
}

// UltraSrtNcst - Updates every 10 minutes
#setBaseTime() {
    const now = moment().tz('Asia/Seoul');
    let minute = now.minute();
    
    // Round down to nearest 10 minutes
    const roundedMinute = Math.floor(minute / 10) * 10;
    const baseTime = now.minute(roundedMinute).format('HHmm');
    
    this.params.base_time = baseTime;
    this.params.base_date = now.format('YYYYMMDD');
}
```

## Additional Patterns

### Observer Pattern
```javascript
// Event-driven updates
class WeatherEventEmitter extends EventEmitter {
    constructor() {
        super();
        this.on('dataUpdate', this.handleDataUpdate);
        this.on('cacheExpired', this.handleCacheExpired);
    }
    
    handleDataUpdate(data) {
        console.log('Weather data updated:', data.timestamp);
        this.emit('notifyClients', data);
    }
}
```

### Command Pattern
```javascript
// Encapsulate API requests as commands
class WeatherCommand {
    constructor(service, params) {
        this.service = service;
        this.params = params;
    }
    
    async execute() {
        return await this.service.get(this.params);
    }
    
    async undo() {
        return await this.service.clearCache(this.params);
    }
}
```

### Proxy Pattern
```javascript
// Rate limiting proxy
class RateLimitedWeatherService {
    constructor(weatherService) {
        this.weatherService = weatherService;
        this.lastCall = null;
        this.minInterval = 1000; // 1 second
    }
    
    async get(params) {
        const now = Date.now();
        if (this.lastCall && (now - this.lastCall) < this.minInterval) {
            await this.delay(this.minInterval - (now - this.lastCall));
        }
        
        this.lastCall = Date.now();
        return await this.weatherService.get(params);
    }
}
```

## Architecture Benefits

### Scalability
- **Auto-scaling Lambda functions** handle variable load
- **Parallel processing** maximizes throughput
- **Distributed caching** reduces API calls

### Reliability
- **Multi-layer caching** provides fallback mechanisms
- **Circuit breaker pattern** prevents cascade failures
- **Retry logic** handles transient failures

### Maintainability
- **Clear inheritance hierarchy** promotes code reuse
- **Separation of concerns** through modules
- **Consistent patterns** across all services

### Performance
- **Intelligent caching** reduces latency
- **Parallel API calls** minimize wait times
- **ARM64 architecture** provides cost-effective performance

### Extensibility
- **Plugin architecture** allows easy addition of new data sources
- **Adapter pattern** handles different data formats
- **Strategy pattern** supports different time-based behaviors

### Cost Optimization
- **Efficient caching** reduces external API calls
- **Serverless architecture** eliminates idle costs
- **ARM64 Lambda** provides 20% cost reduction

---

This comprehensive architecture pattern implementation demonstrates enterprise-grade software design principles applied to a real-world weather data aggregation system. The patterns work together to create a robust, scalable, and maintainable solution that can handle the complexities of integrating multiple external data sources while providing a unified, high-performance API.