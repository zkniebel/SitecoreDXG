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

/**
 * FUNCTIONS
 */

/**
 * Synchronously creates the directory at the given path if it doesn't exist
 * @param {String} path the path of the directory to create
 */
function createDirectorySync(path) {
    if (!fs.existsSync(path)){
        fs.mkdirSync(path);
    }
};

/**
 * EXPORTS
 */

exports.createDirectorySync = createDirectorySync;