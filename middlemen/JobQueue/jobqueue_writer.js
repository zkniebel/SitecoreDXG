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

// node
const fs = require("fs");

// third-party
const amqp = require("amqplib/callback_api");

// local
const unicorn_converter = require("../../serializer/converters/unicorn-converter.js");
const json_converter = require("../../serializer/converters/json-converter.js");
const Documentation_Types = require("../../serializer/types/documentation.js");

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

var args = process.argv.slice(2);

var connectionString = args[0];
if (!connectionString) {
    console.log("No connectionString was passed. Program terminating without sending.");
    _exitProgram(process, 1, conn);
    return;
}

// TODO: change to filePathGlob and add a new parameter that determines which serializer to use
// const unicornSourcesGlob = "C:/Dev/Habitat/src/**/serialization{,/!(Roles)/**}/*.yml";
var unicornRootGlob = args[1];     
if (!unicornRootGlob) {
    console.log("No filePathGlob was passed. Program terminating without sending.");
    _exitProgram(process, 1, conn);
    return;
}

var queue = args[2];     
if (!queue) {
    console.log("No queue was passed. Program terminating without sending.");
    _exitProgram(process, 1, conn);
    return;
}

// TODO: change this function to get the generation source described by user inputs instead of static test data
var getGenerationSource = () => {
    const masterDatabaseName = "master";
    const databaseNames = [ masterDatabaseName ];
    var sitecoreDatabases = unicorn_converter.readAndParseDatabases(unicornRootGlob, databaseNames);

    var metaball = new Documentation_Types.Metaball(
        "Habitat",
        "SitecoreDXG 2.0 Testing",
        "Local",
        "zkniebel",
        "faa8d71050a599b189a8b9f47cb50a389cf400ba",
        "https://github.com/zkniebel/SitecoreDXG/commit/faa8d71050a599b189a8b9f47cb50a389cf400ba");

    var masterHelixDatabaseMap = new Documentation_Types.HelixDatabaseMap(
        masterDatabaseName,
        new Documentation_Types.HelixLayerMap(
            "B26BD035-8D0A-4DF3-8F67-2DE3C7FDD74A".toLowerCase(),
            Documentation_Types.HelixLayerNames.Foundation,
            "393E4EE8-4160-4467-8D42-371FF6A38354|4B333E08-BBB7-48AD-8150-8203BE0CB77C|ADCF25DC-5993-4C20-8204-83DE5A35CBCB|E422EBC8-55CA-40A7-A66A-EB592084516A|7681CF47-9D26-476F-A395-42C0C8D4F18F|7C610278-908F-487C-B32E-C81696D43396|DF639DE8-C9E7-4B18-967E-B1A14A8FF221|53A22396-4581-459D-80D6-47135E1F6F3B|5FD62CDC-BD6E-408C-B88F-9D9C41462CD8|16E64A6E-34A7-42F3-8678-010CC5E4FB39|197A3308-E54C-4E72-944C-A4885C6297E3"
                .toLowerCase()
                .split("|")),
        new Documentation_Types.HelixLayerMap(
            "8F343079-3CC5-4EF7-BC27-32ADDB46F45E".toLowerCase(),
            Documentation_Types.HelixLayerNames.Feature,
            "51745B37-CC61-45C0-982C-BFD80BFD42F0|CC5890AF-54A1-4F8F-9298-A064D631E132|62C10B56-8F99-487B-9843-0949265A58A8|93D8EE88-17AA-4B94-9F58-448D6C3DDBB7|227E4DE1-398E-450F-911D-083F21612119|B327BE93-876A-49C3-9275-422937BCA4A3|4A2CCF0B-9C08-485B-9902-87CA2869BC8F|07BA1E7E-3F43-4D47-B065-3F0F6BA2CA0F|0134CFB3-DDA2-49AB-86A7-BBAEBDB1DC30|DA0DA133-7B20-4317-B4CB-A7B60AF8D6A4|F7CF8EBD-6EC0-467A-92F0-E28EC0AD0F6E|45744E23-A486-4BCA-B333-E7B24B210CC7|E6197898-5ED7-47F5-A15C-B221B9E6866C|F01ECD05-6D91-447F-BA10-3B6347FF3CF6|5C48308A-0749-4895-9AA3-7D9B11EC3AB3|4534144F-68BB-4FB5-9DA3-664CA5DD8E9D|9D79E8FD-E47A-403A-98F4-FE1012E22888|6A127C30-7B97-46BA-851E-90B5AD7C5E4F"
                .toLowerCase()
                .split("|")),
        new Documentation_Types.HelixLayerMap(
            "825B30B4-B40B-422E-9920-23A1B6BDA89C".toLowerCase(),
            Documentation_Types.HelixLayerNames.Project,
            "393E4EE8-4160-4467-8D42-371FF6A38354|4B333E08-BBB7-48AD-8150-8203BE0CB77C|ADCF25DC-5993-4C20-8204-83DE5A35CBCB|E422EBC8-55CA-40A7-A66A-EB592084516A|7681CF47-9D26-476F-A395-42C0C8D4F18F|7C610278-908F-487C-B32E-C81696D43396|DF639DE8-C9E7-4B18-967E-B1A14A8FF221|53A22396-4581-459D-80D6-47135E1F6F3B|5FD62CDC-BD6E-408C-B88F-9D9C41462CD8|16E64A6E-34A7-42F3-8678-010CC5E4FB39|197A3308-E54C-4E72-944C-A4885C6297E3"
                .toLowerCase()
                .split("|")));

    var helixDatabaseMaps = {};
    helixDatabaseMaps[masterDatabaseName] = masterHelixDatabaseMap;

    var generationSource = new Documentation_Types.GenerationSource(
        metaball,
        sitecoreDatabases,
        helixDatabaseMaps);
        
    return json_converter.serialize(generationSource);
}

amqp.connect(connectionString, function(err, connection) {
    if (err) { 
        console.error(err); 
        _exitProgram(process, 1, connection);
    } 

    // create a channel
    connection.createChannel(function(err1, channel) { 
        if (err1) { 
            console.error(err1); 
            _exitProgram(process, 1, connection);
        }   

        channel.assertQueue('', {
            exclusive: true, 
            durable: false
        }, function(err2, q) {
            if (err2) {
                console.error(err2);
                _exitProgram(process, 1, connection);
            }
            // TODO: change this to read from arguments so build ID can be passed
            var generationId = generateUuid();            

            var data = getGenerationSource();        

            console.log(`Serialized source data retrieved. Forwarding to ${queue}...`);

            channel.consume(q.queue, function(msg) {
                if (msg.properties.correlationId === generationId) {
                    console.log(' [.] Generation Response: %s', msg.content.toString());
                    setTimeout(function() {
                        setTimeout(function() { _exitProgram(process, 0, connection) }, 500);
                    }, 500);
                }
            }, {
                noAck: true
            });

            channel.sendToQueue(queue, Buffer.from(data), { correlationId: generationId, replyTo: q.queue});
            console.log(" [x] Sent %s bytes to the generation_queue", data.length);
        });

    });
});

// TODO: remove this
function generateUuid() {
    return Math.random().toString() +
        Math.random().toString() +
        Math.random().toString();
}


