
const { KakaoApi } = require("./getKakaoApi");

module.exports.getInfo = async (event) => {
  console.log(`invoked with event: ${JSON.stringify(event)}`);

  let kakaoApi = new KakaoApi();
  let result = { statusCode: 200, body: "" };

  try {
    if (event.queryStringParameters) {
      const { lat, lon } = event.queryStringParameters;
      result.body = await kakaoApi.byGeoCoord(lat, lon);
    } else if (event.body) {
      const { address } = event.body;
      result.body = await kakaoApi.byAddress(address);
    }
  } catch (error) {
    console.error(error);
    result.statusCode = 500;
    result.body = error.message;
  }

  return result;
};
