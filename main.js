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
const configurationLoader = require("./configuration-loader.js");
const logger = require("./logging.js").logger;

// local - triggers
const triggerManager = require("./triggers/trigger-manager.js").triggerManager;
const rabbitMQListener= require("./triggers/RabbitMQ/rabbitmq-amqp-listener.js");
const expressService = require("./triggers/Express/express-service.js");

/**
 * CONSTANTS
 */

const configuration = configurationLoader.getConfiguration();

/**
 * REGISTER TRIGGERS
 */

rabbitMQListener.registerTrigger(triggerManager);
expressService.registerTrigger(triggerManager);

/**
 * INITIALIZE TRIGGER
 */

triggerManager.initializeTrigger(configuration.Trigger);

