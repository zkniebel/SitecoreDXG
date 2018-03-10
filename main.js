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
const express = require("express");
const bodyParser = require('body-parser');
// local
const configurationLoader = require("./configuration-loader.js");
const mdjre = require("./mdj-reverseengineer.js");

/**
 * CONSTANTS
 */

const app = express();
const router = express.Router();

const configuration = configurationLoader.getConfiguration();
const port = configuration.Port;

/**
 * BODY PARSERS
 */

// create application/json parser
var jsonParser = bodyParser.json();

/**
 * REQUEST HANDLERS
 */

// route prefix
app.use("/sitecore-dxg", router);

// url: <domain>:8023/sitecore-dxg/status
router.get("/status", (request, response) => {
    response.json({ message: "Online" });
});

// url: <domain>:8023/sitecore-dxg/generate/mdj
router.post("/generate/mdj", jsonParser, (request, response) => {
    if (!request.body.Success) {
        response.json({ "Success": false, "ErrorMessage": `Request failed with message "${request.ErrorMessage}"` });
        return;
    }

    // create the target file path at which the output file will be stored
    var targetFolderPath = configuration.createBucketedOutputSubdirectoryPath(true);
    var targetFileName = "Architecture.mdj";
    var targetFilePath = path.join(targetFolderPath, targetFileName);

    try {
        var mdjPath = mdjre.reverseEngineerMetaDataJsonFile(request.body.Data, targetFilePath);
    } catch (error) {
        console.error(error);
        response.json({ "Success": false, "ErrorMessage": `Request failed with error "${error}"` });
        return;
    }

    response.sendFile(targetFileName, { root: targetFolderPath }, function (error) {
        if (error) {
            console.error(error);
            return;
        }
    });
});

// url: <domain>:8023/sitecore-dxg/generate/mdj
router.post("/generate/documentation", jsonParser, (request, response) => {
    if (!request.body.Success) {
        response.json({ "Success": false, "ErrorMessage": `Request failed with message "${request.ErrorMessage}"` });
        return;
    }

    // create the target file path at which the output file will be stored
    var targetFolderPath = configuration.createBucketedOutputSubdirectoryPath(true);
    var targetMdjFileName = "Architecture.mdj";
    var targetMdjFilePath = path.join(targetFolderPath, targetMdjFileName);
    var targetHtmlDocFolderName = "Html_Docs";
    var targetHtmlDocFolderPath = path.join(targetFolderPath, targetHtmlDocFolderName);
    var targetArchiveFileName = targetHtmlDocFolderName + ".zip";
    var targetArchiveFilePath = path.join(targetFolderPath, targetArchiveFileName);

    try {
        mdjre.reverseEngineerMetaDataJsonFile(request.body.Data, targetMdjFilePath);
        mdjre.generateHtmlDocumentationArchive(
            targetMdjFilePath,
            targetHtmlDocFolderPath,
            targetArchiveFilePath,
            function () {
                console.log(`Archive zipped and saved at path "${targetArchiveFilePath}".`);

                response.sendFile(targetArchiveFileName, { root: targetFolderPath }, function (error) {
                    if (error) {
                        console.error(error);
                        return;
                    }
                });
            },
            function (error) {
                console.error(error);
                response.json({ "Success": false, "ErrorMessage": `Error while archiving "${error}"` });
                return;
            });
    } catch (error) {
        console.error(error);
        response.json({ "Success": false, "ErrorMessage": `Request failed with error "${error}"` });
        return;
    }
});

// start listening
app.listen(port, () => console.log(`Sitecore DXG Service Started. Listening on port ${port}`));