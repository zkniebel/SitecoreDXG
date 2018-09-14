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
const fs = require("fs");
const cp = require("child_process");


/**
 * FUNCTIONS
 */

/**
 * Recursively installs the dependencies for the module in the decendent folders of the given path using npm
 * @param {string} dirPath the path to the directory in which to recursively install packages
 */
const npmInstallRecursive = function (dirPath) {
    fs.readdirSync(dirPath).forEach(function (currentPath) {
        var currentPath = path.join(dirPath, currentPath);
        if (!fs.lstatSync(currentPath).isDirectory()) {
            return;
        }
        
        console.log(`Checking path "${currentPath}" for modules to install...`);

        if (fs.existsSync(path.join(currentPath, "package.json"))) {        
            console.log(`Installing module in directory "${currentPath}"...`);
            cp.spawn("npm.cmd", ["i"], { env: process.env, cwd: currentPath, stdio: "inherit" });
        } else {
           npmInstallRecursive(currentPath);
        }
    });
};


/**
 * NPM INSTALL DESCENDANTS
 */

// install dependencies for the completion handlers
npmInstallRecursive(path.join(__dirname, "/plugins/completion_handlers"));
// install dependencies for the triggers
npmInstallRecursive(path.join(__dirname, "/plugins/triggers"));