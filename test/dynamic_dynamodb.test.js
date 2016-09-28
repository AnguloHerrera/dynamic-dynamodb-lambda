/**
 * Test dependencies
 */
var assert = require('assert'),
    fs = require('fs'),
    exec = require('child_process').exec;

// Load configuration
var nconf = require('nconf');

var DYNAMO_FILE = __dirname + "/dynamo.json";
var CLOUDWATCH_FILE = __dirname + "/cloudwatch.json";
var CONFIG_FILE = __dirname + "/config.json";

nconf.file(CLOUDWATCH_FILE);
var cloudwatch_init = nconf.get();

nconf.file(DYNAMO_FILE);
var dynamo_init = nconf.get();

nconf.file(CONFIG_FILE);
var config_init = nconf.get();

describe('Lambda Dynamic DynamoDB - Autoscale Table (Increase)', function () {
  this.timeout(20000);

  afterEach(function(done){
    fs.writeFile(DYNAMO_FILE, JSON.stringify(dynamo_init, null, 4), function (error) {
      assert.ok(!error);
      fs.writeFile(CLOUDWATCH_FILE, JSON.stringify(cloudwatch_init, null, 4), function (error) {
        assert.ok(!error);
        fs.writeFile(CONFIG_FILE, JSON.stringify(config_init, null, 4), function (error) {
          assert.ok(!error);
          done();
        });
      });
    });    

  }); 

  it('fail to update table when reads are increased', function (done) {
    var dynamo = JSON.parse(JSON.stringify(dynamo_init));
    var read = dynamo.Table.ProvisionedThroughput.ReadCapacityUnits;

    var cloudwatch_file = JSON.parse(JSON.stringify(cloudwatch_init));
    cloudwatch_file.read.Datapoints[0].Sum = 10000;

    fs.writeFile(CLOUDWATCH_FILE, JSON.stringify(cloudwatch_file, null, 4), function (error) {
      assert(!error);
      /* Execution lambda-dynamic-dynamodb */

      // Exec node-lambda commands in lambda-dynamic-dynamodb folder
      exec("(node-lambda setup) && (node-lambda run)", {cwd: 'test'},  function (error, stdout, stderr) {          
        assert.ok(!error);

        nconf.file(DYNAMO_FILE);
        var dynamo_file = nconf.get();

        var new_read = dynamo_file.Table.ProvisionedThroughput.ReadCapacityUnits;

        assert(new_read>read);
        done();   

      });

    });

  });

  it('fail to update table when writes are increased', function (done) {
    var dynamo = JSON.parse(JSON.stringify(dynamo_init));
    var write = dynamo.Table.ProvisionedThroughput.WriteCapacityUnits;

    var cloudwatch_file = JSON.parse(JSON.stringify(cloudwatch_init));
    cloudwatch_file.write.Datapoints[0].Sum = 10000;

    fs.writeFile(CLOUDWATCH_FILE, JSON.stringify(cloudwatch_file, null, 4), function (error) {
      assert(!error);
      /* Execution lambda-dynamic-dynamodb */

      // Exec node-lambda commands in lambda-dynamic-dynamodb folder
      exec("(node-lambda setup) && (node-lambda run)", {cwd: 'test'}, function (error, stdout, stderr) {            
        assert.ok(!error);

        nconf.file(DYNAMO_FILE);
        var dynamo_file = nconf.get();

        var new_write = dynamo_file.Table.ProvisionedThroughput.WriteCapacityUnits;

        assert(new_write>write);
        done();        

      });

    });

  });

  it('fail to update table when reads are increased but autoscale in reading arent enabled', function (done) {
    var config = JSON.parse(JSON.stringify(config_init));
    config.tables[0].enable_read = 0;

    fs.writeFile(CONFIG_FILE, JSON.stringify(config, null, 4), function (error) {
      assert(!error);

      var dynamo = JSON.parse(JSON.stringify(dynamo_init));
      var read = dynamo.Table.ProvisionedThroughput.ReadCapacityUnits;

      var cloudwatch_file = JSON.parse(JSON.stringify(cloudwatch_init));
      cloudwatch_file.read.Datapoints[0].Sum = 10000;

      fs.writeFile(CLOUDWATCH_FILE, JSON.stringify(cloudwatch_file, null, 4), function (error) {
        assert(!error);
        /* Execution lambda-dynamic-dynamodb */

        // Exec node-lambda commands in lambda-dynamic-dynamodb folder
        exec("(node-lambda setup) && (node-lambda run)", {cwd: 'test'}, function (error, stdout, stderr) {       
          assert.ok(!error);

          nconf.file(DYNAMO_FILE);
          var dynamo_file = nconf.get();

          var new_read = dynamo_file.Table.ProvisionedThroughput.ReadCapacityUnits;

          assert(new_read==read);
          done();         

        });

      });
    });

  });  

  it('fail to update table when writes are increased but autoscale in writting arent enabled', function (done) {
    var config = JSON.parse(JSON.stringify(config_init));
    config.tables[0].enable_write = 0;

    fs.writeFile(CONFIG_FILE, JSON.stringify(config, null, 4), function (error) {
      assert(!error);

      var dynamo = JSON.parse(JSON.stringify(dynamo_init));
      var write = dynamo.Table.ProvisionedThroughput.WriteCapacityUnits;

      var cloudwatch_file = JSON.parse(JSON.stringify(cloudwatch_init));
      cloudwatch_file.write.Datapoints[0].Sum = 10000;

      fs.writeFile(CLOUDWATCH_FILE, JSON.stringify(cloudwatch_file, null, 4), function (error) {
        assert(!error);
        /* Execution lambda-dynamic-dynamodb */

        // Exec node-lambda commands in lambda-dynamic-dynamodb folder
        exec("(node-lambda setup) && (node-lambda run)", {cwd: 'test'}, function (error, stdout, stderr) {          
          assert.ok(!error);

          nconf.file(DYNAMO_FILE);
          var dynamo_file = nconf.get();

          var new_write = dynamo_file.Table.ProvisionedThroughput.WriteCapacityUnits;

          assert(new_write==write);
          done();     

        });

      });
    });

  }); 

});

describe('Lambda Dynamic DynamoDB - Autoscale Table (Decrease)', function () {
  this.timeout(20000);

  beforeEach(function(done) {
    var dynamo = JSON.parse(JSON.stringify(dynamo_init));

    dynamo.Table.ProvisionedThroughput.ReadCapacityUnits = 10;
    dynamo.Table.ProvisionedThroughput.WriteCapacityUnits = 10;
    fs.writeFile(DYNAMO_FILE, JSON.stringify(dynamo, null, 4), function (error) {
      assert.ok(!error);
      done();
    });
  });  

  afterEach(function(done){
    fs.writeFile(DYNAMO_FILE, JSON.stringify(dynamo_init, null, 4), function (error) {
      assert.ok(!error);
      fs.writeFile(CLOUDWATCH_FILE, JSON.stringify(cloudwatch_init, null, 4), function (error) {
        assert.ok(!error);
        fs.writeFile(CONFIG_FILE, JSON.stringify(config_init, null, 4), function (error) {
          assert.ok(!error);
          done();
        });
      });
    });    

  }); 

  it('fail to update table when reads are decreased', function (done) {
    nconf.file(DYNAMO_FILE);
    var dynamo = nconf.get();
    var read = dynamo.Table.ProvisionedThroughput.ReadCapacityUnits;

    var cloudwatch_file = JSON.parse(JSON.stringify(cloudwatch_init));
    cloudwatch_file.read.Datapoints[0].Sum = 1;

    fs.writeFile(CLOUDWATCH_FILE, JSON.stringify(cloudwatch_file, null, 4), function (error) {
      assert(!error);
      /* Execution lambda-dynamic-dynamodb */

      // Exec node-lambda commands in lambda-dynamic-dynamodb folder
      exec("(node-lambda setup) && (node-lambda run)", {cwd: 'test'}, function (error, stdout, stderr) {           
        assert.ok(!error);

        nconf.file(DYNAMO_FILE);
        var dynamo_file = nconf.get();

        var new_read = dynamo_file.Table.ProvisionedThroughput.ReadCapacityUnits;

        assert(new_read<read);
        done();   

      });

    });

  });

  it('fail to update table when writes are decreased', function (done) {
    nconf.file(DYNAMO_FILE);
    var dynamo = nconf.get();
    var write = dynamo.Table.ProvisionedThroughput.WriteCapacityUnits;

    var cloudwatch_file = JSON.parse(JSON.stringify(cloudwatch_init));
    cloudwatch_file.write.Datapoints[0].Sum = 1;

    fs.writeFile(CLOUDWATCH_FILE, JSON.stringify(cloudwatch_file, null, 4), function (error) {
      assert(!error);
      /* Execution lambda-dynamic-dynamodb */

      // Exec node-lambda commands in lambda-dynamic-dynamodb folder
      exec("(node-lambda setup) && (node-lambda run)", {cwd: 'test'}, function (error, stdout, stderr) {          
        assert.ok(!error);

        nconf.file(DYNAMO_FILE);
        var dynamo_file = nconf.get();

        var new_write = dynamo_file.Table.ProvisionedThroughput.WriteCapacityUnits;

        assert(new_write<write);
        done();        

      });

    });

  });

  it('fail to update table when reads are decreased but autoscale in reading arent enabled', function (done) {
    var config = JSON.parse(JSON.stringify(config_init));
    config.tables[0].enable_read = 0;

    fs.writeFile(CONFIG_FILE, JSON.stringify(config, null, 4), function (error) {
      assert(!error);

      nconf.file(DYNAMO_FILE);
      var dynamo = nconf.get();
      var read = dynamo.Table.ProvisionedThroughput.ReadCapacityUnits;

      var cloudwatch_file = JSON.parse(JSON.stringify(cloudwatch_init));
      cloudwatch_file.read.Datapoints[0].Sum = 1;

      fs.writeFile(CLOUDWATCH_FILE, JSON.stringify(cloudwatch_file, null, 4), function (error) {
        assert(!error);
        /* Execution lambda-dynamic-dynamodb */

        // Exec node-lambda commands in lambda-dynamic-dynamodb folder
        exec("(node-lambda setup) && (node-lambda run)", {cwd: 'test'}, function (error, stdout, stderr) {          
          assert.ok(!error);

          nconf.file(DYNAMO_FILE);
          var dynamo_file = nconf.get();

          var new_read = dynamo_file.Table.ProvisionedThroughput.ReadCapacityUnits;

          assert(new_read==read);
          done();         

        });

      });
    });

  });  

  it('fail to update table when writes are decreased but autoscale in writting arent enabled', function (done) {
    var config = JSON.parse(JSON.stringify(config_init));
    config.tables[0].enable_write = 0;

    fs.writeFile(CONFIG_FILE, JSON.stringify(config, null, 4), function (error) {
      assert(!error);

      nconf.file(DYNAMO_FILE);
      var dynamo = nconf.get();
      var write = dynamo.Table.ProvisionedThroughput.WriteCapacityUnits;

      var cloudwatch_file = JSON.parse(JSON.stringify(cloudwatch_init));
      cloudwatch_file.write.Datapoints[0].Sum = 1;

      fs.writeFile(CLOUDWATCH_FILE, JSON.stringify(cloudwatch_file, null, 4), function (error) {
        assert(!error);
        /* Execution lambda-dynamic-dynamodb */

        // Exec node-lambda commands in lambda-dynamic-dynamodb folder
        exec("(node-lambda setup) && (node-lambda run)", {cwd: 'test'}, function (error, stdout, stderr) {           
          assert.ok(!error);

          nconf.file(DYNAMO_FILE);
          var dynamo_file = nconf.get();

          var new_write = dynamo_file.Table.ProvisionedThroughput.WriteCapacityUnits;

          assert(new_write==write);
          done();     

        });

      });
    });

  }); 

});


describe('Lambda Dynamic DynamoDB - Autoscale GSI (Increase)', function () {
  this.timeout(20000);

  beforeEach(function(done) {
    var config = JSON.parse(JSON.stringify(config_init));

    var elem = config.tables[0];
    elem['gsiName'] = "key-index";
    config.tables[0] = elem;
    fs.writeFile(CONFIG_FILE, JSON.stringify(config, null, 4), function (error) {
      assert.ok(!error);
      done();
    });
  });

  afterEach(function(done) {
    fs.writeFile(DYNAMO_FILE, JSON.stringify(dynamo_init, null, 4), function (error) {
      assert.ok(!error);
      fs.writeFile(CLOUDWATCH_FILE, JSON.stringify(cloudwatch_init, null, 4), function (error) {
        assert.ok(!error);
        fs.writeFile(CONFIG_FILE, JSON.stringify(config_init, null, 4), function (error) {
          assert.ok(!error);
          done();
        });
      });
    });    

  }); 

  it('fail to update table gsi when reads are increased', function (done) {
    var dynamo = JSON.parse(JSON.stringify(dynamo_init));
    var read = dynamo.Table.GlobalSecondaryIndexes[0].ProvisionedThroughput.ReadCapacityUnits;

    var cloudwatch_file = JSON.parse(JSON.stringify(cloudwatch_init));
    cloudwatch_file.read.Datapoints[0].Sum = 10000;

    fs.writeFile(CLOUDWATCH_FILE, JSON.stringify(cloudwatch_file, null, 4), function (error) {
      assert(!error);
      /* Execution lambda-dynamic-dynamodb */

      // Exec node-lambda commands in lambda-dynamic-dynamodb folder
      exec("(node-lambda setup) && (node-lambda run)", {cwd: 'test'}, function (error, stdout, stderr) {           
        assert.ok(!error);

        nconf.file(DYNAMO_FILE);
        var dynamo_file = nconf.get();

        var new_read = dynamo_file.Table.GlobalSecondaryIndexes[0].ProvisionedThroughput.ReadCapacityUnits;

        assert(new_read>read);
        done();   

      });

    });

  });

  it('fail to update table gsi when writes are increased', function (done) {
    var dynamo = JSON.parse(JSON.stringify(dynamo_init));
    var write = dynamo.Table.GlobalSecondaryIndexes[0].ProvisionedThroughput.WriteCapacityUnits;

    var cloudwatch_file = JSON.parse(JSON.stringify(cloudwatch_init));
    cloudwatch_file.write.Datapoints[0].Sum = 10000;

    fs.writeFile(CLOUDWATCH_FILE, JSON.stringify(cloudwatch_file, null, 4), function (error) {
      assert(!error);
      /* Execution lambda-dynamic-dynamodb */

      // Exec node-lambda commands in lambda-dynamic-dynamodb folder
      exec("(node-lambda setup) && (node-lambda run)", {cwd: 'test'}, function (error, stdout, stderr) {           
        assert.ok(!error);

        nconf.file(DYNAMO_FILE);
        var dynamo_file = nconf.get();

        var new_write = dynamo_file.Table.GlobalSecondaryIndexes[0].ProvisionedThroughput.WriteCapacityUnits;

        assert(new_write>write);
        done();        

      });

    });

  });

  it('fail to update table gsi when reads are increased but autoscale in reading arent enabled', function (done) {
    nconf.file(CONFIG_FILE);
    var config = nconf.get();
    config.tables[0].enable_read = 0;

    fs.writeFile(CONFIG_FILE, JSON.stringify(config, null, 4), function (error) {
      assert(!error);

      var dynamo = JSON.parse(JSON.stringify(dynamo_init));
      var read = dynamo.Table.GlobalSecondaryIndexes[0].ProvisionedThroughput.ReadCapacityUnits;

      var cloudwatch_file = JSON.parse(JSON.stringify(cloudwatch_init));
      cloudwatch_file.read.Datapoints[0].Sum = 10000;

      fs.writeFile(CLOUDWATCH_FILE, JSON.stringify(cloudwatch_file, null, 4), function (error) {
        assert(!error);
        /* Execution lambda-dynamic-dynamodb */

        // Exec node-lambda commands in lambda-dynamic-dynamodb folder
        exec("(node-lambda setup) && (node-lambda run)", {cwd: 'test'}, function (error, stdout, stderr) {          
          assert.ok(!error);

          nconf.file(DYNAMO_FILE);
          var dynamo_file = nconf.get();

          var new_read = dynamo_file.Table.GlobalSecondaryIndexes[0].ProvisionedThroughput.ReadCapacityUnits;

          assert(new_read==read);
          done();         

        });

      });
    });

  });  

  it('fail to update table gsi when writes are increased but autoscale in writting arent enabled', function (done) {
    nconf.file(CONFIG_FILE);
    var config = nconf.get();
    config.tables[0].enable_write = 0;

    fs.writeFile(CONFIG_FILE, JSON.stringify(config, null, 4), function (error) {
      assert(!error);

      var dynamo = JSON.parse(JSON.stringify(dynamo_init));
      var write = dynamo.Table.GlobalSecondaryIndexes[0].ProvisionedThroughput.WriteCapacityUnits;

      var cloudwatch_file = JSON.parse(JSON.stringify(cloudwatch_init));
      cloudwatch_file.write.Datapoints[0].Sum = 10000;

      fs.writeFile(CLOUDWATCH_FILE, JSON.stringify(cloudwatch_file, null, 4), function (error) {
        assert(!error);
        /* Execution lambda-dynamic-dynamodb */

        // Exec node-lambda commands in lambda-dynamic-dynamodb folder
        exec("(node-lambda setup) && (node-lambda run)", {cwd: 'test'}, function (error, stdout, stderr) {          
          assert.ok(!error);

          nconf.file(DYNAMO_FILE);
          var dynamo_file = nconf.get();

          var new_write = dynamo_file.Table.GlobalSecondaryIndexes[0].ProvisionedThroughput.WriteCapacityUnits;

          assert(new_write==write);
          done();     

        });

      });
    });

  }); 

});


describe('Lambda Dynamic DynamoDB - Autoscale GSI (Decrease)', function () {
  this.timeout(20000);

  beforeEach(function(done) {
    var config = JSON.parse(JSON.stringify(config_init));

    var elem = config.tables[0];
    elem['gsiName'] = "key-index";
    config.tables[0] = elem;
    fs.writeFile(CONFIG_FILE, JSON.stringify(config, null, 4), function (error) {
      assert.ok(!error);
      var dynamo = JSON.parse(JSON.stringify(dynamo_init));

      dynamo.Table.ProvisionedThroughput.ReadCapacityUnits = 10;
      dynamo.Table.ProvisionedThroughput.WriteCapacityUnits = 10;
      fs.writeFile(DYNAMO_FILE, JSON.stringify(dynamo, null, 4), function (error) {
        assert.ok(!error);
        done();
      });
    });
  });

  afterEach(function(done) {
    fs.writeFile(DYNAMO_FILE, JSON.stringify(dynamo_init, null, 4), function (error) {
      assert.ok(!error);
      fs.writeFile(CLOUDWATCH_FILE, JSON.stringify(cloudwatch_init, null, 4), function (error) {
        assert.ok(!error);
        fs.writeFile(CONFIG_FILE, JSON.stringify(config_init, null, 4), function (error) {
          assert.ok(!error);
          done();
        });
      });
    });    

  }); 

  it('fail to update table gsi when reads are decreased', function (done) {
    nconf.file(DYNAMO_FILE);
    var dynamo = nconf.get();
    var read = dynamo.Table.GlobalSecondaryIndexes[0].ProvisionedThroughput.ReadCapacityUnits;

    var cloudwatch_file = JSON.parse(JSON.stringify(cloudwatch_init));
    cloudwatch_file.read.Datapoints[0].Sum = 10000;

    fs.writeFile(CLOUDWATCH_FILE, JSON.stringify(cloudwatch_file, null, 4), function (error) {
      assert(!error);
      /* Execution lambda-dynamic-dynamodb */

      // Exec node-lambda commands in lambda-dynamic-dynamodb folder
      exec("(node-lambda setup) && (node-lambda run)", {cwd: 'test'}, function (error, stdout, stderr) {         
        assert.ok(!error);

        nconf.file(DYNAMO_FILE);
        var dynamo_file = nconf.get();

        var new_read = dynamo_file.Table.GlobalSecondaryIndexes[0].ProvisionedThroughput.ReadCapacityUnits;

        assert(new_read>read);
        done();   

      });

    });

  });

  it('fail to update table gsi when writes are decreased', function (done) {
    nconf.file(DYNAMO_FILE);
    var dynamo = nconf.get();
    var write = dynamo.Table.GlobalSecondaryIndexes[0].ProvisionedThroughput.WriteCapacityUnits;

    var cloudwatch_file = JSON.parse(JSON.stringify(cloudwatch_init));
    cloudwatch_file.write.Datapoints[0].Sum = 10000;

    fs.writeFile(CLOUDWATCH_FILE, JSON.stringify(cloudwatch_file, null, 4), function (error) {
      assert(!error);
      /* Execution lambda-dynamic-dynamodb */

      // Exec node-lambda commands in lambda-dynamic-dynamodb folder
      exec("(node-lambda setup) && (node-lambda run)", {cwd: 'test'}, function (error, stdout, stderr) {       
        assert.ok(!error);

        nconf.file(DYNAMO_FILE);
        var dynamo_file = nconf.get();

        var new_write = dynamo_file.Table.GlobalSecondaryIndexes[0].ProvisionedThroughput.WriteCapacityUnits;

        assert(new_write>write);
        done();        

      });

    });

  });

  it('fail to update table gsi when reads are decreased but autoscale in reading arent enabled', function (done) {
    nconf.file(CONFIG_FILE);
    var config = nconf.get();
    config.tables[0].enable_read = 0;

    fs.writeFile(CONFIG_FILE, JSON.stringify(config, null, 4), function (error) {
      assert(!error);

      nconf.file(DYNAMO_FILE);
      var dynamo = nconf.get();
      var read = dynamo.Table.GlobalSecondaryIndexes[0].ProvisionedThroughput.ReadCapacityUnits;

      var cloudwatch_file = JSON.parse(JSON.stringify(cloudwatch_init));
      cloudwatch_file.read.Datapoints[0].Sum = 10000;

      fs.writeFile(CLOUDWATCH_FILE, JSON.stringify(cloudwatch_file, null, 4), function (error) {
        assert(!error);
        /* Execution lambda-dynamic-dynamodb */

        // Exec node-lambda commands in lambda-dynamic-dynamodb folder
        exec("(node-lambda setup) && (node-lambda run)", {cwd: 'test'}, function (error, stdout, stderr) {          
          assert.ok(!error);

          nconf.file(DYNAMO_FILE);
          var dynamo_file = nconf.get();

          var new_read = dynamo_file.Table.GlobalSecondaryIndexes[0].ProvisionedThroughput.ReadCapacityUnits;

          assert(new_read==read);
          done();         

        });

      });
    });

  });  

  it('fail to update table gsi when writes are decreased but autoscale in writting arent enabled', function (done) {
    nconf.file(CONFIG_FILE);
    var config = nconf.get();
    config.tables[0].enable_write = 0;

    fs.writeFile(CONFIG_FILE, JSON.stringify(config, null, 4), function (error) {
      assert(!error);

      nconf.file(DYNAMO_FILE);
      var dynamo = nconf.get();
      var write = dynamo.Table.GlobalSecondaryIndexes[0].ProvisionedThroughput.WriteCapacityUnits;

      var cloudwatch_file = JSON.parse(JSON.stringify(cloudwatch_init));
      cloudwatch_file.write.Datapoints[0].Sum = 10000;

      fs.writeFile(CLOUDWATCH_FILE, JSON.stringify(cloudwatch_file, null, 4), function (error) {
        assert(!error);
        /* Execution lambda-dynamic-dynamodb */

        // Exec node-lambda commands in lambda-dynamic-dynamodb folder
        exec("(node-lambda setup) && (node-lambda run)", {cwd: 'test'}, function (error, stdout, stderr) {          
          assert.ok(!error);

          nconf.file(DYNAMO_FILE);
          var dynamo_file = nconf.get();

          var new_write = dynamo_file.Table.GlobalSecondaryIndexes[0].ProvisionedThroughput.WriteCapacityUnits;

          assert(new_write==write);
          done();     

        });

      });
    });

  }); 

});
