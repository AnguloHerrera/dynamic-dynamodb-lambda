exports.handler = function(event, context) {

    var async = require("async");
    var nconf = require('nconf');

    var CONFIG_FILE = __dirname + "/config.json";
    nconf.file(CONFIG_FILE);
    var config = nconf.get();
    
    var tasks = require('./tasks.js');
    tasks.init(config);

    var result_failed = [];
    var result_updated = [];
    var result_passed = [];

    var enable_tables = [];

    for (var i = 0; i < config.tables.length; i++) {
        var is_enable_read = config.tables[i].enable_read;
        var is_enable_write = config.tables[i].enable_write;
        var is_enable_read_throttle = config.tables[i].enable_read_throttle;      
        var is_enable_write_throttle = config.tables[i].enable_write_throttle;                

        if (is_enable_read || is_enable_write || is_enable_read_throttle || is_enable_write_throttle)
            enable_tables.push(config.tables[i]);
    }

    async.each(enable_tables,function(item,callback_outer){
        async.waterfall([

            // 1. get Data by AWS API
            function(callback){
                async.parallel([
                    function(callback_inner){ tasks.getTask_tableDesc(item.tableName, item.gsiName, callback_inner); }, // 0
                    function(callback_inner){ tasks.getTask_consumedReadCapa(item.enable_read, item.tableName, item.gsiName, callback_inner) }, // 1
                    function(callback_inner){ tasks.getTask_consumedWriteCapa(item.enable_write, item.tableName, item.gsiName, callback_inner) }, // 2
                    function(callback_inner){ tasks.getTask_readThrottleEvents(item.enable_read_throttle, item.tableName, item.gsiName, callback_inner) }, // 3
                    function(callback_inner){ tasks.getTask_writeThrottleEvents(item.enable_write_throttle, item.tableName, item.gsiName, callback_inner) }, // 4
                ],
                //callback_inner - PARALLEL
                function(err, results) {
                    if (err) {
                        callback(err);
                    }
                    else {
                        var readCapa = results[0].readCapa;
                        var readUsed = results[1];
                        var writeCapa = results[0].writeCapa;
                        var writeUsed = results[2];
                        var status = results[0].status;
                        var remainDecreaseNum = results[0].remainDecreaseNum;
                        var readThrottle = results[3];
                        var writeThrottle = results[4];

                        callback(null,readCapa,readUsed,writeCapa,writeUsed,status,remainDecreaseNum,readThrottle,writeThrottle);
                    }
                });
            },

            // 2. computes new read/write Capacity
            function(readCapa,readUsed,writeCapa,writeUsed,status,remainDecreaseNum,readThrottle,writeThrottle,callback){
                var newReadCapa=readCapa;
                var newWriteCapa=writeCapa;

                if (item.enable_read || readThrottle > 0)
                    newReadCapa= tasks.getTask_newCapa(readCapa,readUsed,item.reads_upper_threshold,item.reads_lower_threshold,item.increase_reads_with,item.decrease_reads_with,item.base_reads,item.high_reads) || readCapa;
                
                if (item.enable_write || writeThrottle > 0)
                    newWriteCapa= tasks.getTask_newCapa(writeCapa,writeUsed,item.writes_upper_threshold,item.writes_lower_threshold,item.increase_writes_with,item.decrease_writes_with,item.base_writes,item.high_reads) || writeCapa;

                if (status !== 'ACTIVE') {
                    callback({
                                tableName : item.tableName,
                                gsiName : item.gsiName || "",
                                code : 'pass',
                                result : 'status is not ACTIVE'
                            });
                }
                // If we are out of decreases and there are no increases for read or write
                else if (remainDecreaseNum === 0 && readCapa === Math.max(readCapa, newReadCapa) && writeCapa === Math.max(writeCapa, newWriteCapa) && (readCapa !== newReadCapa || writeCapa !== newWriteCapa)) {
                    callback({
                                tableName : item.tableName,
                                gsiName : item.gsiName || "",
                                code : 'pass',
                                result : 'Depleted today\'s # of decrease throughput',
                                detail : 'read - capacity:'+readCapa+', decreased capacity:'+newReadCapa
                                    +' // write - capacity:'+writeCapa+', decreased capacity:'+newWriteCapa
                            });
                }
                else {
                    // If we are out of decreases set the new capacity to the max of the new and old capacities
                    if (remainDecreaseNum === 0) {
                        newReadCapa = Math.max(readCapa, newReadCapa);
                        newWriteCapa = Math.max(writeCapa, newWriteCapa);
                    }

                    if (readCapa === newReadCapa && writeCapa === newWriteCapa) {
                        callback({
                                tableName : item.tableName,
                                gsiName : item.gsiName || "",
                                code : 'pass',
                                result : 'no need to update Table',
                                detail : 'read - capacity:'+readCapa+', consumed:'+readUsed + ' Read Throttle ' + readThrottle
                                    +' // write - capacity:'+writeCapa+', consumed:'+writeUsed + ' Write Throttle ' + writeThrottle
                            });
                    }
                    else {
                        callback(null,readCapa,readUsed,newReadCapa,writeCapa,writeUsed,newWriteCapa,readThrottle,writeThrottle);
                    }
                }
            },

            // 3. update read/write Capacity by AWS API
            function(readCapa,readUsed,newReadCapa,writeCapa,writeUsed,newWriteCapa,readThrottle,writeThrottle,callback){
                tasks.setTask_updateTable(item.tableName, item.gsiName, readCapa,readUsed,newReadCapa,writeCapa,writeUsed,newWriteCapa,readThrottle,writeThrottle,callback); }
            ],


            // Callback - WATERFALL
            function(result){
                var resultString;

                if (result.gsiName === undefined || result.gsiName === "")
                    resultString = result.tableName+' : '+result.result;
                else
                    resultString = result.tableName+'_'+result.gsiName+' : '+result.result;

                unhandledString = item.tableName+' :unhandled error';
                if (result.detail)
                {
                    resultString += ' : '+result.detail;
                }

                if (result.code) {
                    switch (result.code) {
                    case 'update':
                        result_updated.push(resultString);
                        console.log(JSON.stringify(resultString, null, 4));
                        break;
                    case 'pass':
                        result_passed.push(resultString);
                        console.log(JSON.stringify(resultString, null, 4));
                        break;
                    case 'error':
                        result_failed.push(resultString);
                        console.log(JSON.stringify(resultString, null, 4));
                        break;
                    default:
                        result_failed.push(unhandledString);
                        console.log(JSON.stringify(unhandledString, null, 4));
                    }
                }
                else {
                    result_failed.push(unhandledString);
                    console.log(JSON.stringify(unhandledString, null, 4));
                }
                callback_outer(null);

            }
        );

    }
    ,
    //callback_outer - EACH
    function(err){

        var result_concat = result_failed.concat(result_updated,result_passed);

        if (result_failed.length > 0) {
            context.fail(result_concat);
        }
        else {
            context.succeed(result_concat);
        }

    });
};