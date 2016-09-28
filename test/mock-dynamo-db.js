var nconf = require('nconf'),
    fs = require('fs');

// load dynamo.json
var DYNAMO_FILE = __dirname + "/dynamo.json";

exports.describeTable = function(params, callback) {
    nconf.file(DYNAMO_FILE);
    var dynamo = nconf.get();
    callback(undefined, dynamo);
}

exports.updateTable = function(params, callback) {
    nconf.file(DYNAMO_FILE);
    var dynamo = nconf.get();

    if ('ProvisionedThroughput' in params) {
        var old_read = dynamo.Table.ProvisionedThroughput.ReadCapacityUnits;
        var old_write = dynamo.Table.ProvisionedThroughput.WriteCapacityUnits;

        dynamo.Table.ProvisionedThroughput.ReadCapacityUnits = params.ProvisionedThroughput.ReadCapacityUnits;
        dynamo.Table.ProvisionedThroughput.WriteCapacityUnits = params.ProvisionedThroughput.WriteCapacityUnits;

        if (old_read > dynamo.Table.ProvisionedThroughput.ReadCapacityUnits || old_write > dynamo.Table.ProvisionedThroughput.WriteCapacityUnits)
            dynamo.Table.ProvisionedThroughput.NumberOfDecreasesToday = dynamo.Table.ProvisionedThroughput.NumberOfDecreasesToday + 1; 
    } else if ('GlobalSecondaryIndexUpdates' in params) {
        var old_read = dynamo.Table.GlobalSecondaryIndexes[0].ProvisionedThroughput.ReadCapacityUnits;
        var old_write = dynamo.Table.GlobalSecondaryIndexes[0].ProvisionedThroughput.WriteCapacityUnits;

        dynamo.Table.GlobalSecondaryIndexes[0].ProvisionedThroughput.ReadCapacityUnits = params.GlobalSecondaryIndexUpdates[0].Update.ProvisionedThroughput.ReadCapacityUnits;
        dynamo.Table.GlobalSecondaryIndexes[0].ProvisionedThroughput.WriteCapacityUnits = params.GlobalSecondaryIndexUpdates[0].Update.ProvisionedThroughput.WriteCapacityUnits;

        if (old_read > dynamo.Table.GlobalSecondaryIndexes[0].ProvisionedThroughput.ReadCapacityUnits || old_write > dynamo.Table.GlobalSecondaryIndexes[0].ProvisionedThroughput.WriteCapacityUnits)
            dynamo.Table.GlobalSecondaryIndexes[0].ProvisionedThroughput.NumberOfDecreasesToday = dynamo.Table.GlobalSecondaryIndexes[0].ProvisionedThroughput.NumberOfDecreasesToday + 1;
    } else {
        callback({
            message: 'Error in mock Dynamo-DB in updateTable. Invalid parameters.'
        });
    }

    // Save dynamo parameters in file
    fs.writeFile(DYNAMO_FILE, JSON.stringify(dynamo, null, 4), function (error) {
        callback(error, dynamo);
        if (!error)
            console.log("Updated table OK");
    });
}