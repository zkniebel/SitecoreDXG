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

// local
const settings = require("./settings.js");
const fileUtils = require("./utils/file-utils.js");

/**
 * TYPES
 */

/**
 * Configuration object for the program
 */
function SitecoreDXGConfiguration() {
    /**
     * @property The port number that the API should listen on
     */
    this.Port = 8023;
    /**
     * @property Holds the root path where output files are stored (Default: C:\\SitecoreDXG)
     */
    this.OutputDirectoryPath = "C:\\SitecoreDXG";

    /** 
     * @method createBucketedOutputSubdirectoryPath Creates the folders in the bucketed output subdirectory path (if they don't already exist) and returns the full path 
     * @param {bool} includeUniqueFolder (optional) if true, a unique folder will be added in the bucket and included in the returned path
     * @returns {string}
     */
    this.createBucketedOutputSubdirectoryPath = (includeUniqueFolder) => {
        var now = new Date(Date.now());
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
        fileUtils.createDirectorySync(this.OutputDirectoryPath);
    };
};

/**
 * FUNCTIONS
 */

/**
 * Gets the configuration
 * @returns {SitecoreDXGConfiguration}
 */
function getConfiguration() {
    var config = extend(new SitecoreDXGConfiguration(), settings);
    config._initialize();
    
    return config;
};

/**
 * EXPORTS
 */

exports.SitecoreDXGConfiguration = SitecoreDXGConfiguration;
exports.getConfiguration = getConfiguration;


