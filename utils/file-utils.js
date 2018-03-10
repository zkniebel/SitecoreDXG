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
const archiver = require("archiver");

/**
 * PUBLIC FUNCTIONS
 */

/**
 * Synchronously creates the directory at the given path if it doesn't exist
 * @param {String} path the path of the directory to create
 */
var createDirectorySync = (path) => {
    if (!fs.existsSync(path)) {
        fs.mkdirSync(path);
    }
};

/**
 * Zips the given folder path into an archive at the specified path
 * @param {string} folderPath the path of the folder to archive
 * @param {string} archiveFilePath the path where the output archive should be staved
 * @param {function} successCallback the callback to call on success
 * @param {function} errorCallback the callback to call on error
 */
var createArchive = (folderPath, archiveFilePath, successCallback, errorCallback) => {
    var archive = archiver("zip");
    var archiveFileOutput = fs.createWriteStream(archiveFilePath);

    // on successful close, execute the success callback function
    archiveFileOutput.on("close", successCallback);

    // add the folder to the archive
    archive.pipe(archiveFileOutput);
    archive.directory(folderPath, false);

    // on error, execute the error callback function
    archive.on("error", errorCallback);

    // finalize and close the archive
    archive.finalize();
};

/**
 * EXPORTS
 */

exports.createDirectorySync = createDirectorySync;
exports.createArchive = createArchive;