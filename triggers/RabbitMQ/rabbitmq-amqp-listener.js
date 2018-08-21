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


/**
 * DEPENDENCIES
 */

// third-party
var amqp = require('amqplib/callback_api');
const winston = require("winston");

// local
const configurationLoader = require("../../configuration-loader.js");
const logger = require("../../logging.js").logger;
const generation = require("../../generation.js");


/**
 * CONSTANTS
 */

const configuration = configurationLoader.getConfiguration();
const TRIGGER_ID = configuration.Triggers.RabbitMQ.TriggerID;


/**
 * FUNCTIONS
 */

/**
 * Initializes the listener for the given connection and queue with the given callback function
 * @param {object} connection the connection to add the listener to
 * @param {string} queue the name of the queue to listen to
 * @param {function} callback the callback function to be called when a message is read from the queue (message is the first argment and the message's content as a string is the second argument)
 */
var _initializeListenerForQueue = function (connection, queue, callback) {
  // create the listener for the 
  connection.createChannel(function (err, ch) {
    ch.assertQueue(queue, { durable: false }, function (err) {
      if (err) {
        logger.error(err);
      }
    });

    logger.info(" [*] Waiting for messages in %s. To exit press CTRL+C", queue);
    ch.consume(queue, function (msg) {
      var msgContentString = msg.content.toString();
      logger.info(" [x] Received message consisting of %s bytes", msgContentString.length);

      if (typeof callback !== "undefined") {
        callback(msg, msgContentString);
      }

    }, { noAck: true });
  });
};

/**
 * Initializes the trigger
 */
var initialize = function () {
  amqp.connect(configuration.Triggers.RabbitMQ.ConnectionString, function (err, conn) {

    if (err) {
      logger.error("[AMQP]:", err.message);
      return setTimeout(initialize, 1000);
    }
    conn.on("error", function(err) {
      if (err.message !== "Connection closing") {
        logger.error("[AMQP]: conn error", err.message);
      }
    });
    conn.on("close", function() {
      logger.error("[AMQP]: reconnecting");
      return setTimeout(initialize, 1000);
    });

    logger.info("[AMQP]: connected");

    // create the listener for the documentation generation queue
    _initializeListenerForQueue(conn, configuration.Triggers.RabbitMQ.DocumentationGenerationQueueName, function (msg, rawData) {
      var parsedData = JSON.parse(rawData);
      logger.info("Passing data to documentation generator...");
      generation.generateDocumentation(
        parsedData.Data,
        function (targetArchiveFilePath, targetArchiveFileName, targetFolderPath, targetHtmlDocFolderPath, targetMdjFilePath) {
          logger.info(`MDJ File Saved to: "${targetHtmlDocFolderPath}"`);
        },
        function (error) {
          logger.error(`Generation failed with error: "${error}"`);
        }
      );
    });

    // create the listener for the MDJ file generation queue
    _initializeListenerForQueue(conn, configuration.Triggers.RabbitMQ.MDJGenerationQueueName, function (msg, rawData) {
      var parsedData = JSON.parse(rawData);
      logger.info("Passing data to documentation generator...");
      generation.generateMetaDataJson(
        parsedData.Data,
        function (mdjPath, targetFileName, targetFolderPath, targetFilePath) {
          logger.info(`MDJ File Saved to: "${targetFilePath}"`);
        },
        function (error) {
          logger.error(`Generation failed with error: "${error}"`);
        }
      );
    });
  });
};

/**
 * Registers the trigger for the given triggerManager - this function is required on all trigger modules
 * @param {object} triggerManager the trigger manager to register the trigger for
 */
var registerTrigger = function (triggerManager) {
  triggerManager.registerTrigger(TRIGGER_ID, initialize);
};

exports.TRIGGER_ID = TRIGGER_ID;
exports.initialize = initialize;
exports.registerTrigger = registerTrigger;