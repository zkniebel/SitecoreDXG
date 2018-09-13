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
const path = require("path");

// third-party
const extend = require("extend");
const guid = require("guid");
const leftPad = require("left-pad");
const mkdirp = require("mkdirp");

// local
const settings = require("../settings.js").configuration;
const fileUtils = require("./file-utils.js");

/**
 * TYPES
 */

/**
 * Configuration object for the program
 */
function SitecoreDXGConfiguration() {
    /**
     * @property The root path where output files are stored (Default: "C:\\SitecoreDXG\\Work")
     */
    this.OutputDirectoryPath = "C:\\SitecoreDXG\\Work";    
    /**
     * @property The path to where log files will be written (Default: "C:\\SitecoreDXG\\Logs")
     */
    this.LogsDirectoryPath = "C:\\SitecoreDXG\\Logs";
    /**
     * @property The minimum priority level of log messages for them to be written to the log (Default: "info")
     */
    this.LogLevel = "info";
    /**
     * @property The completion handler ID-Parameters objects representing the completion handlers to be called after generation is complete
     */
    this.DefaultCompletionHandlers = [];

    /**
     * @property The settings for the completion handlers
     */
    this.CompletionHandlers = {
        /**
         * @property The settings for the AWS S3 Deploy completion handler
         */
        AWSS3Deploy: {
            /**
             * @property The maximum number of files to be opened/uploaded at any given time
             */
            MaxConcurrency: 250                         
        },
        /**
         * @property The settings for the Azure Blob Storage Deploy completion handler
         */
        AzureBlobStorageDeploy: {                       
            /**
             * @property The maximum number of files to be opened/uploaded at any given time
             */
            MaxConcurrency: 250                        
        }
    };
    
    /**
     * @property The settings for the triggers
     */
    this.Triggers = {
        /**
         * @property The settings for the Express trigger
         */
        Express: {
            /**
             * @property The port number that the API should listen on (Default: 8023)
             */
            Port: 8023
        },
        /**
         * @property The settings for the RabbitMQ trigger
         */
        RabbitMQ: {         
            /**
             * @property The connection string used to connect to the queue server
             */
            ConnectionString: "amqp://localhost?heartbeat=60",
            /**
             * @property The name of the documentation generation queue
             */
            DocumentationGenerationQueueName: "generation_queue__documentation",
            /**
             * @property The name of the MDJ file generation queue
             */
            MDJGenerationQueueName: "generation_queue__mdj"
        }
    };

    /**
     * @property The port number that the API should listen on (Default: 8023)
     */
    this.Port = 8023;

    /**
     * @property The name of the trigger that is to be used when the server is started
     */
    this.Trigger = "RabbitMQ";


    /** 
     * @method createBucketedOutputSubdirectoryPath Creates the folders in the bucketed output subdirectory path (if they don't already exist) and returns the full path 
     * @param {bool} includeUniqueFolder (optional) if true, a unique folder will be added in the bucket and included in the returned path
     * @returns {string}
     */
    this.createBucketedOutputSubdirectoryPath = (includeUniqueFolder) => {
        var now = new Date();
        var bucketPath = this.OutputDirectoryPath;

        // get/create the year folder
        bucketPath = path.join(bucketPath, `${now.getUTCFullYear()}`);
        fileUtils.createDirectorySync(bucketPath);
        // get/create the month folder
        bucketPath = path.join(bucketPath, `${leftPad(now.getUTCMonth() + 1, 2, 0)}`);
        fileUtils.createDirectorySync(bucketPath);
        // get/create the day folder
        bucketPath = path.join(bucketPath, `${leftPad(now.getUTCDate(), 2, 0)}`);
        fileUtils.createDirectorySync(bucketPath);

        // create a unique folder if necessary
        if (includeUniqueFolder) {
            bucketPath = path.join(bucketPath, guid.raw());
            fileUtils.createDirectorySync(bucketPath);
        }

        return bucketPath;
    };

    /** 
     * @method _initialize Initializes the configuration object 
     */
    this._initialize = () => {
        // ensure the logs directory path exists
        mkdirp.sync(_configuration.LogsDirectoryPath);
        // ensure the output directory path exists
        mkdirp.sync(this.OutputDirectoryPath);
    };
};

/**
 * PROPERTIES
 */

var _configuration = undefined;

/**
 * FUNCTIONS
 */

/**
 * Gets the configuration
 * @returns {SitecoreDXGConfiguration}
 */
function getConfiguration() {
    if (_configuration) {
        return _configuration;
    }

    _configuration = extend(true, new SitecoreDXGConfiguration(), settings);
    _configuration._initialize();

    return _configuration;
};

/**
 * EXPORTS
 */

exports.SitecoreDXGConfiguration = SitecoreDXGConfiguration;
exports.getConfiguration = getConfiguration;


