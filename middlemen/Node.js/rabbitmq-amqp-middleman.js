#!/usr/local/env node

/*
 * Copyright (c) 2018 Zachary Kniebel. All rights reserved.
 *
 * NOTICE:  All information contained herein is, and remains the 
 * property of Zachary Kniebel. The intellectual and technical 
 * concepts contained herein are proprietary to Zachary Kniebel and
 * may be covered by U.S. and Foreign Patents, patents in process, 
 * and are protected by trade secret or copyright law. Dissemination 
 * of this information or reproduction of this material is strictly 
 * forbidden unless prior written permission is obtained from Zachary
 * Kniebel (contact@zacharykniebel.com).
 *
 */
 
/* DEPENDENCIES */

// third-party
const amqp = require('amqplib/callback_api');
const request = require('request');

/* EXECUTION */

/**
 * Optionally closes the connection and exits with the given exit code
 * @param {object} process process object to exit
 * @param {integer} exitCode exit code value to be passed upon exiting  
 * @param {object} connection (optional) connection to be closed
 */
var _exitProgram = function(process, exitCode, connection) {
    if (connection) {
        connection.close(); 
    }

    process.exit(0);
};

amqp.connect('amqp://localhost', function(err, conn) {
    // create a channel
    conn.createChannel(function(err, ch) {
        var q = 'generation_queue__documentation';
        var jsonGetUrl = process.argv.slice(2).join(' ');
        
        if (!jsonGetUrl) {
            console.log("No jsonGetUrl was passed. Program terminating without sending.");
            _exitProgram(process, 1, conn);
            return;
        }

        request(jsonGetUrl, (err, res, data) => {
            if (err) { 
                return console.error(err); 
                _exitProgram(process, 1, conn);
            }
            var json = JSON.parse(data);
            if (!json.Success) {
                console.error("An error occurred while retrieving the architecture data. Program terminating...", json);
                _exitProgram(process, 1, conn);
            }

            console.log("Architecture data received. Forwarding to generation_queue...");
            ch.assertQueue(q, {durable: false});
            ch.sendToQueue(q, Buffer.from(data));
            console.log(" [x] Sent %s bytes to the generation_queue", data.length);

            setTimeout(function() { _exitProgram(process, 0, conn) }, 500);
        });
    });
});

