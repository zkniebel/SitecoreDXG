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

// node
const fs = require("fs");

// third-party
const winston = require("winston");
const leftPad = require("left-pad");

// local
const fileUtils = require("./utils/file-utils.js");
const configurationLoader = require("./configuration-loader.js");

/**
 * PROPERTIES
 */

const _configuration = configurationLoader.getConfiguration();

/**
 * EXECUTION
 */

const getFormat = () => {
    var now = new Date();
    var year = now.getUTCFullYear();
    var month = leftPad(now.getUTCMonth() + 1, 2, 0);
    var day = leftPad(now.getUTCDate(), 2, 0);
    var hour = leftPad(now.getUTCHours(), 2, 0);
    var minute = leftPad(now.getUTCMinutes(), 2, 0);
    var second = leftPad(now.getUTCSeconds(), 2, 0);
    return `[${year}.${month}.${day} ${hour}:${minute}:${second}]`;
};

const logger = new (winston.Logger)({
    transports: [
        new (winston.transports.Console)({
            json: false,
            colorize: true,
            timestamp: getFormat,
            level: _configuration.LogLevel
        }),
        new (require("winston-daily-rotate-file"))({
            filename: `${_configuration.LogsDirectoryPath}/-log.txt`,
            datePattern: "yyyy.MM.dd",
            prepend: true,
            json: false,
            colorize: false,
            timestamp: getFormat,
            level: _configuration.LogLevel
        })
    ]
});

exports.logger = logger;