var env = { };
var DEFAULT_TIMEFRAMEMIN = 3;

// initialize
exports.init = function(config) {
    if ('debug' in config && config.debug === 1) {
        env.db = require('./mock-dynamo-db.js');
        env.cloudwatch = require('./mock-cloudwatch.js');
    } else {
        env.AWS = require('aws-sdk') // AWS object
        env.AWS.config.update({region: config.region}); // update Region info
        env.db = new env.AWS.DynamoDB(); // dynamoDB object
        env.cloudwatch = new env.AWS.CloudWatch(); // cloudWatch object
    }
    env.timeframeMin = config.timeframeMin || DEFAULT_TIMEFRAMEMIN; // used capa check Period
    // startTime,endTime for using cloudwatch API
    env.startTime = new Date();
    env.endTime = new Date();
    env.startTime.setTime(env.endTime-(60000*env.timeframeMin));
    env.decreaseDailyLimit = 4;
};

// get Table info or get GSI of Table info
exports.getTask_tableDesc = function(tableName, gsiName, callback) {
    var params = { TableName: tableName };
    env.db.describeTable(params, function(err, data) {
        if (err) {
            callback({
                tableName : tableName,
                code : 'error',
                result : 'describeTable API failed',
                detail : err.message
            });
        }
        else {
            if (gsiName === undefined) {
                callback(null, {
                    readCapa : data.Table.ProvisionedThroughput.ReadCapacityUnits,
                    writeCapa : data.Table.ProvisionedThroughput.WriteCapacityUnits,
                    status : data.Table.TableStatus,
                    remainDecreaseNum : env.decreaseDailyLimit-data.Table.ProvisionedThroughput.NumberOfDecreasesToday
                });
            } else {
                var gsi = data.Table.GlobalSecondaryIndexes;
                if (gsi === undefined) {
                    callback({
                        tableName : tableName,
                        gsiName: gsiName,
                        code : 'error',
                        result : 'describeTable API failed',
                        detail : 'The table has not Global Secondary Indexes'
                    });
                } else {
                    var index = 0;
                    var gsi_elem = undefined;

                    while (index < gsi.length && gsi_elem === undefined) {
                        if (gsi[index].IndexName === gsiName) {
                            gsi_elem = gsi[index];
                        }
                        index++;
                    }

                    if (gsi_elem === undefined) { // Not found gsi
                        callback({
                            tableName : tableName,
                            gsiName: gsiName,
                            code : 'error',
                            result : 'describeTable API failed',
                            detail : 'The table has not the Global Secondary Index ' + gsiName
                        });                        
                    } else {
                        callback(null, {
                            readCapa : gsi_elem.ProvisionedThroughput.ReadCapacityUnits,
                            writeCapa : gsi_elem.ProvisionedThroughput.WriteCapacityUnits,
                            status : gsi_elem.IndexStatus,
                            remainDecreaseNum : env.decreaseDailyLimit-gsi_elem.ProvisionedThroughput.NumberOfDecreasesToday
                        });                
                    }
                }
            }
        }
    });
};

// get Table or GSI of Table consumed ReadCapacity (avg)
exports.getTask_consumedReadCapa = function(enable, tableName, gsiName, callback) {
    if (enable) {
        var dimensions = [{
                Name: 'TableName', // required
                Value: tableName // required
            }];

        if (gsiName !== undefined) {
            dimensions.push({
                Name: 'GlobalSecondaryIndexName',
                Value: gsiName
            });
        }

        var params = {
            EndTime: env.endTime, // required
            MetricName: 'ConsumedReadCapacityUnits', // required
            Namespace: 'AWS/DynamoDB', //required
            Period: (env.timeframeMin*60), // required
            StartTime: env.startTime, // required
            Statistics: [ 'Sum' ],
            Dimensions: dimensions,
            Unit: 'Count'
        };
        env.cloudwatch.getMetricStatistics(params, function(err, data) {
            if (err) {
                callback({
                    tableName : tableName,
                    code : 'error',
                    result : 'getMetricStatistics(get ConsumedReadCapacityUnits) API failed',
                    detail : err.message
                });
            }
            else {
                callback(null,data.Datapoints.length === 0 ? 0 : Math.round(data.Datapoints[0].Sum/60/env.timeframeMin));
            }
        });
    } else {
        callback(null, null);
    }
};

// get Table or GSI of Table events Read Throttle (sum)
exports.getTask_readThrottleEvents = function(enable, tableName, gsiName, callback) {
    if (enable) {
        var dimensions = [{
                Name: 'TableName', // required
                Value: tableName // required
            }];

        if (gsiName !== undefined) {
            dimensions.push({
                Name: 'GlobalSecondaryIndexName',
                Value: gsiName
            });
        }

        var params = {
            EndTime: env.endTime, // required
            MetricName: 'ReadThrottleEvents', // required
            Namespace: 'AWS/DynamoDB', //required
            Period: (env.timeframeMin*60), // required
            StartTime: env.startTime, // required
            Statistics: [ 'Sum' ],
            Dimensions: dimensions,
            Unit: 'Count'
        };
        env.cloudwatch.getMetricStatistics(params, function(err, data) {
            if (err) {
                callback({
                    tableName : tableName,
                    code : 'error',
                    result : 'getMetricStatistics(get ConsumedReadCapacityUnits) API failed',
                    detail : err.message
                });
            }
            else {
                callback(null,data.Datapoints.length === 0 ? 0 : Math.round(data.Datapoints[0].Sum/60/env.timeframeMin));
            }
        });
    } else {
        callback(null, null);
    }
};

// get Table or GSI of Table events Writes Throttle (sum)
exports.getTask_writeThrottleEvents = function(enable, tableName, gsiName, callback) {
    if (enable) {
        var dimensions = [{
                Name: 'TableName', // required
                Value: tableName // required
            }];

        if (gsiName !== undefined) {
            dimensions.push({
                Name: 'GlobalSecondaryIndexName',
                Value: gsiName
            });
        }

        var params = {
            EndTime: env.endTime, // required
            MetricName: 'WriteThrottleEvents', // required
            Namespace: 'AWS/DynamoDB', //required
            Period: (env.timeframeMin*60), // required
            StartTime: env.startTime, // required
            Statistics: [ 'Sum' ],
            Dimensions: dimensions,
            Unit: 'Count'
        };
        env.cloudwatch.getMetricStatistics(params, function(err, data) {
            if (err) {
                callback({
                    tableName : tableName,
                    code : 'error',
                    result : 'getMetricStatistics(get ConsumedReadCapacityUnits) API failed',
                    detail : err.message
                });
            }
            else {
                callback(null,data.Datapoints.length === 0 ? 0 : Math.round(data.Datapoints[0].Sum/60/env.timeframeMin)); // TODO : revisar
            }
        });
    } else {
        callback(null, null);
    }
};

// get Table's consumed WriteCapacity (avg)
exports.getTask_consumedWriteCapa = function(enable, tableName, gsiName, callback) {
    if (enable) {
        var dimensions = [{
                Name: 'TableName', // required
                Value: tableName // required
            }];

        if (gsiName !== undefined) {
            dimensions.push({
                Name: 'GlobalSecondaryIndexName',
                Value: gsiName
            });
        }

        var params = {
            EndTime: env.endTime, // required
            MetricName: 'ConsumedWriteCapacityUnits', // required
            Namespace: 'AWS/DynamoDB', //required
            Period: (env.timeframeMin*60), // required
            StartTime: env.startTime, // required
            Statistics: [ 'Sum' ],
            Dimensions: dimensions,
            Unit: 'Count'
        };
        env.cloudwatch.getMetricStatistics(params, function(err, data) {
            if (err) {
                callback({
                    tableName : tableName,
                    code : 'error',
                    result : 'getMetricStatistics(get ConsumedWriteCapacityUnits) API failed',
                    detail : err.message
                });
            }
            else {
                callback(null,data.Datapoints.length === 0 ? 0 : Math.round(data.Datapoints[0].Sum/60/env.timeframeMin));
            }
        });
    } else {
        callback(null, null);
    }
};

// calculate Capacity to update
exports.getTask_newCapa = function(capa,used,upperThsd,lowerThsd,increseAmt,decreseAmt,base,high) {
    var rate = (used/capa)*100;
    if ( rate > upperThsd )
    {
        return Math.min(Math.round(capa+(capa*(increseAmt/100))),high);
    }
    else if ( rate < lowerThsd )
    {
        return Math.max(Math.round(capa-(capa*(decreseAmt/100))),base);
    }
    else
    {
        return capa;
    }
};

// update Table with now Capacity
exports.setTask_updateTable = function(tableName,gsiName,readCapa,readUsed,newReadCapa,writeCapa,writeUsed,newWriteCapa,readThrottle,writeThrottle,callback) {
    var params = {
        TableName: tableName // required
    };

    if (gsiName === undefined) { // Update Table
        params['ProvisionedThroughput'] = {
            ReadCapacityUnits: newReadCapa, /* required */
            WriteCapacityUnits: newWriteCapa /* required */
        };
    } else {
        params['GlobalSecondaryIndexUpdates'] = [
            {
                Update: {
                    IndexName: gsiName, /* required */
                    ProvisionedThroughput: { /* required */
                        ReadCapacityUnits: newReadCapa, /* required */
                        WriteCapacityUnits: newWriteCapa /* required */
                    }
                }                
            }
        ];
    }

    env.db.updateTable(params, function(err, data) {
        if (err) {
            callback({
                tableName : tableName,
                gsiName : gsiName || "",
                code : 'error',
                result : 'updateTable API failed',
                detail : err.message
            });
        }
        else {
            callback({
                tableName : tableName,
                gsiName : gsiName || "",
                code : 'update',
                result : 'table capacity updated',
                detail : 'read - capacity:'+readCapa+', consumed:'+readUsed+ ' Read Throttle ' + readThrottle + ' => changedCapa:'+newReadCapa
                        +' // write - capacity:'+writeCapa+', consumed:'+writeUsed+ ' Write Throttle ' + writeThrottle + ' => changedCapa:'+newWriteCapa
            });
        }
    });
};