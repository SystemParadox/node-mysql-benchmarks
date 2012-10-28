/**
 * Copyright (C) 2012, Oleg Efimov and other contributors
 *
 * See license text in LICENSE file
 */

"use strict";

function benchmark() {
  // Require modules
  var mysql = require('mysql'),
      conn;

  function selectAsyncBenchmark(results, callback, cfg, benchmark) {
    var
      start_time,
      total_time;
    
    start_time = Date.now();

    var rows = [];
    conn.query(cfg.select_query)
        .on('error', function(err) {
          console.error(err);
          process.exit();
        })
        .on('result', function(result) {
          rows.push(result);
        })
        .on('end', function() {
          total_time = (Date.now() - start_time) / 1000;
          
          results['selects'] = Math.round(cfg.insert_rows_count / total_time)
          
          // Close connection
          conn.end();
          
          // Finish benchmark
          callback(results);
        });
  }

  function insertAsyncBenchmark(results, callback, cfg, benchmark) {
    var
      start_time,
      total_time,
      i = 0;
    
    start_time = Date.now();
    
    function insertAsync() {
      i += 1;
      if (i <= cfg.insert_rows_count) {
        conn.query(cfg.insert_query)
            .on('error', function(err) {
              console.error(err);
              process.exit();
            })
            .on('end', insertAsync);
      } else {
        total_time = (Date.now() - start_time) / 1000;
        
        results['inserts'] = Math.round(cfg.insert_rows_count / total_time)
        
        setTimeout(function () {
          selectAsyncBenchmark(results, callback, cfg, benchmark);
        }, cfg.delay_before_select);
      }
    }
    
    insertAsync();
  }

  function escapeBenchmark(results, callback, cfg, benchmark) {
    var
      start_time,
      total_time,
      i = 0,
      escaped_string;
    
    start_time = Date.now();
    
    for (i = 0; i < cfg.escapes_count; i += 1) {
      escaped_string = conn.escape(cfg.string_to_escape);
    }
    
    total_time = (Date.now() - start_time) / 1000;
    
    results['escapes'] = Math.round(cfg.escapes_count / total_time)
    
    insertAsyncBenchmark(results, callback, cfg, benchmark);
  }

  function initBenchmark(results, callback, cfg, benchmark) {
    var
      start_time,
      total_time;
    
    start_time = Date.now();

    conn = mysql.createConnection({
      host:     cfg.host,
      port:     cfg.port,
      user:     cfg.user,
      password: cfg.password,
      database: cfg.database,
      typeCast: benchmark.typeCast
    });
    conn.query("DROP TABLE IF EXISTS " + cfg.test_table)
        .on('error', function(err) {
          console.error(err);
          process.exit();
        });
    conn.query(cfg.create_table_query)
        .on('error', function(err) {
          console.error(err);
          process.exit();
        })
        .on('end', function() {
          total_time = (Date.now() - start_time) / 1000;
          results['init'] = total_time;
          escapeBenchmark(results, callback, cfg, benchmark);
        });
  }

  var cfg = '';
  process.stdin.setEncoding('utf8');
  process.stdin.on('data', function(data) {
    cfg += data;
  });
  process.stdin.on('end', function() {
    var results = {},
        callback = function() {
          process.stdout.write(JSON.stringify(results));
        };

    cfg = JSON.parse(cfg);
    initBenchmark(results, callback, cfg, cfg.benchmark);
  });
  process.stdin.resume();
}

if (!module.parent) {
  benchmark();
}

exports.run = function (callback, cfg, benchmark) {
  require('./helper').spawnBenchmark('node', [__filename], callback, cfg, benchmark);
};
