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
const winston = require("winston");

// local
const logger = require("./logging.js").logger;

/**
 * TYPES
 */

function TriggerManager() {
    /**
     * @property map of IDs to trigger initializers
     */
    this._triggers = {};

    /**
     * Registers the trigger initializer with the given ID
     */
    this.registerTrigger = function (id, initializer) {
        this._triggers[id] = initializer;
    };

    /**
     * Initializes the trigger with the given ID
     * @param {string} id the ID of the trigger that should be initialized
     */
    this.initializeTrigger = function (id) {
        var initializer = this._triggers[id];
        if (typeof initializer !== "function") {
            logger.error(`Invalid trigger registration for trigger "${id}".`);
            return;
        }

        logger.info(`Initializing trigger "${id}"...`);
        initializer();
    }
};

const triggerManager = new TriggerManager();

exports.triggerManager = triggerManager;