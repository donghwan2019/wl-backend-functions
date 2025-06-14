const slsw = require("serverless-webpack");
const nodeExternals = require("webpack-node-externals");

console.log("WEBPACK MODE:", slsw.lib.webpack.isLocal ? "development" : "production");

module.exports = {
  entry: slsw.lib.entries,
  target: "node",
  externals: [nodeExternals()],
  mode: slsw.lib.webpack.isLocal ? "development" : "production",
  devtool: slsw.lib.webpack.isLocal ? "source-map" : false,
  module: {
    rules: [
      {
        loader: "babel-loader",
        include: __dirname,
        exclude: /node_modules/
      },
      {
        test: /\.csv$/,
        loader: 'csv-loader',
        options: {
          dynamicTyping: true,
          header: true,
          skipEmptyLines: true
        }
      }
    ]
  }
};
