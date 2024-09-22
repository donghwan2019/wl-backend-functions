
const AWS = require('aws-sdk');

export class ControllerS3 {
  constructor() {
    this.bucket = "wl-backend-functions";
    this.region = "ap-northeast-2";
    this.s3 = new AWS.S3({ params: { Bucket: this.bucket } });
  }

  async _saveToS3(key, list) {
    console.log(
      `key: ${key} length: ${list.length} [0] ${JSON.stringify(
        list[0],
        null,
        2
      )}`
    );
    const ndjsonData = list.map((item) => JSON.stringify(item)).join("\n");

    const params = {
      Bucket: this.bucket,
      Key: `${key}.ndjson`,
      Body: ndjsonData,
    };
    await this.s3
      .upload(params, function (err, data) {
        if (err) {
          console.error("Error uploading file:", err);
        } else {
          console.log("Successfully uploaded file:", data.Location);
        }
      })
      .promise();
  }

  async _loadFromS3(key) {
    try {
      const params = {
        Bucket: this.bucket,
        Key: `${key}.ndjson`,
      };
      const data = await this.s3.getObject(params).promise();
      const ndjsonData = data.Body.toString("utf-8");

      // NDJSON 파싱하여 JSON 객체 배열로 변환
      const jsonObjects = ndjsonData
        .split("\n")
        .filter((line) => line.trim() !== "")
        .map((line) => JSON.parse(line));

      return jsonObjects;
    } catch (err) {
      console.error("Failed to load data from S3:", err);
      return null;
    }
  }

  //get json object list from s3 by athena query
  async _loadFromS3ByAthena(key) {
    const athena = new AWS.Athena({ region: this.region });
    const params = {
      QueryString: `SELECT * FROM s3://${this.bucket}/${key}.ndjson`,
      QueryExecutionContext: {
        Database: "default",
      },
      ResultConfiguration: {
        OutputLocation: `s3://${this.bucket}/athena-results/`,
      },
    };
    const data = await athena.startQueryExecution(params).promise();
    return data;
  }
}
