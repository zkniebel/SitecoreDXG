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
const glob = require("glob");

// local
const configurationLoader = require("./common/configuration-loader.js");
const completionHandlerManager = require("./generator/completion-handler-manager.js").completionHandlerManager;
const triggerManager = require("./generator/trigger-manager.js").triggerManager;

/**
 * CONSTANTS
 */

const configuration = configurationLoader.getConfiguration();

/**
 * REGISTER COMPLETION HANDLERS
 */

glob.sync("./completion_handlers/**{,!(node_modules)/**}*.js").forEach(function(file) {
    var completionHandler = require(path.resolve(file));
    completionHandler.registerCompletionHandler(completionHandlerManager);
});

/**
 * REGISTER TRIGGERS
 */

glob.sync("./triggers/**{,!(node_modules)/**}*.js").forEach(function(file) {
    var trigger = require(path.resolve(file));
    trigger.registerTrigger(triggerManager);
});

/**
 * INITIALIZE SELECTED TRIGGER
 */

triggerManager.initializeTrigger(configuration.Trigger);

