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

// local
const logger = require("./logging.js").logger;

/**
 * TYPES
 */

function CompletionHandlerManager() {
    /**
     * @property map of IDs to completion handler functions
     */
    this._completionHandlers = {};

    /**
     * Registers the completion handler function with the given ID
     * @property {string} id The id of the completion handler
     * @property {function} completionHandler The function to call for the completion handler
     */
    this.registerCompletionHandler = function (id, completionHandler) {
        this._completionHandlers[id] = completionHandler;
    };

    /**
     * Calls the completion handlers with the given IDs, passing them the given output directory path
     * @param {Array<string>} completionHandlerIDs the IDs of the completion handlers that should be executed
     * @param {string} outputDirectoryPath the path of the output directory
     */
    this.callCompletionHandlers = function (completionHandlerIDs, outputDirectoryPath) {
        var configuratoinHandlerManager = this;
        completionHandlerIDs.forEach(function(id) {
            var completionHandler = configuratoinHandlerManager._completionHandlers[id];
            if (typeof completionHandler !== "function") {
                logger.error(`Completion handler "${id}" was not found or has an invalid registration. Skipping...`);
                return;
            }
    
            logger.info(`Calling completion handler "${id}"...`);
            completionHandler(outputDirectoryPath, logger);
        });
    }
};

const completionHandlerManager = new CompletionHandlerManager();

exports.completionHandlerManager = completionHandlerManager;