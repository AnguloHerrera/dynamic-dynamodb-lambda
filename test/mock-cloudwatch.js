var nconf = require('nconf');
var CLOUDWATCH_FILE = __dirname + "/cloudwatch.json";

exports.getMetricStatistics = function(params, callback) {
    nconf.file(CLOUDWATCH_FILE);
    var cloudwatch = nconf.get(); 
    
    if (params.MetricName === "ConsumedReadCapacityUnits") {
        callback(undefined, cloudwatch.read);
    } else if (params.MetricName === "ConsumedWriteCapacityUnits") {
        callback(undefined, cloudwatch.write);
    } else {
        callback({
            message: "Error in mock Cloudwatch in getMetricStatistics. Invalid MetricName, whose value is " + params.MetricName
        });
    }
}