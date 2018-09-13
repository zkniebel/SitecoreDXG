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
const express = require("express");
const bodyParser = require("body-parser");

/**
 * CONSTANTS
 */

const TRIGGER_ID = "Express";

/**
 * FUNCTIONS
 */

var initialize = function(configurationLoader, generation, logger) {
    const configuration = configurationLoader.getConfiguration();
    const port = configuration.Triggers.Express.Port;    

    const app = express();
    const router = express.Router();

    // create application/json parser
    var jsonParser = bodyParser.json();

    // set request size limits
    app.use(bodyParser.json({limit: '10mb'}));
    app.use(bodyParser.urlencoded({limit: '10mb', extended: true}));

    // route prefix
    app.use("/sitecoredxg", router);

    // url: <domain>:8023/sitecoredxg/status
    router.get("/status", (request, response) => {
        response.json({ message: "Online" });
    });

    // url: <domain>:8023/sitecoredxg/generate/mdj
    router.post("/generate/mdj", jsonParser, (request, response) => {
        if (!request.body.Success) {
            response.json({ "Success": false, "ErrorMessage": `Request failed with message "${request.ErrorMessage}"` });
            return;
        }

        generation.generateMetaDataJson(
            request.body.Data,
            function(mdjPath, targetFileName, targetFolderPath, targetFilePath) {
                response.sendFile(targetFileName, { root: targetFolderPath }, function (error) {
                    if (error) {
                        logger.error(error);
                        return;
                    }
                });
            },
            function(error) {
                response.json({ "Success": false, "ErrorMessage": `Request failed with error "${error}"` });
            });
    });

    // url: <domain>:8023/sitecoredxg/generate/mdj
    router.post("/generate/documentation", jsonParser, (request, response) => {
        if (!request.body.Success) {
            response.json({ "Success": false, "ErrorMessage": `Request failed with message "${request.ErrorMessage}"` });
            return;
        }

        generation.generateDocumentation(
            request.body.Data,
            function(targetArchiveFilePath, targetArchiveFileName, targetFolderPath, targetHtmlDocFolderPath, targetMdjFilePath) {
                response.sendFile(targetArchiveFileName, { root: targetFolderPath }, function (error) {
                    if (error) {
                        logger.error(error);
                        return;
                    }
                });
            },
            function(error) { 
                response.json({ "Success": false, "ErrorMessage": `Request failed with error "${error}"` }); 
            });
    });

    // start listening
    const server = app.listen(port, () => logger.info(`Sitecore DXG Service Started. Listening on port ${port}`));

    // increase the timeout to 30 minutes
    server.timeout = 1800000; 
};

/**
 * Registers the trigger for the given triggerManager
 * @param {object} triggerManager the trigger manager to register the trigger for
 */
var registerTrigger = function(triggerManager) {
  triggerManager.registerTrigger(TRIGGER_ID, initialize);
};

exports.TRIGGER_ID = TRIGGER_ID;
exports.initialize = initialize;
exports.registerTrigger = registerTrigger;