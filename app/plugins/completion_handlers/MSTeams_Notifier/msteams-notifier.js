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
var request = require("request");


/**
 * CONSTANTS
 */

const COMPLETIONHANDLER_ID = "MSTeams_Notifier";


/**
 * FUNCTIONS
 */

/**
 * Executes the completion handler with the given output directory path 
 * @param {string} outputDirectoryPath the path to the output directory
 * @param {object} configurationLoader the configuration loader module
 * @param {object} metaball holds the metadata from the generation
 * @param {object} logger the logger
 * @param {Array<*>} params array of custom parameters
 */
var _execute = function (outputDirectoryPath, configurationLoader, metaball, logger, params) {
    if (!params || !params.Url) {
        logger.error("MS Teams notifier requires a params object with a \"Url\" parameter as an argument");
        return;
    }

    var basicInfoItems = [];
    if (metaball.ProjectName) {
        basicInfoItems.push({
            "name": "Project Title",
            "value": metaball.ProjectName
        });
    }        
    if (metaball.EnvironmentName) {
        basicInfoItems.push({
            "name": "Environment Name",
            "value": metaball.EnvironmentName
        });
    }      
    if (metaball.DocumentationTitle) {
        basicInfoItems.push({
            "name": "Documentation Title",
            "value": metaball.DocumentationTitle
        });
    }
    if (metaball.StartTime > 0) {
        var dateStr = new Date(metaball.StartTime).toUTCString();
        basicInfoItems.push({
            "name": "Started",
            "value": dateStr
        });
    }
    if (metaball.EndTime > 0) {
        var dateStr = new Date(metaball.EndTime).toUTCString();
        basicInfoItems.push({
            "name": "Completed",
            "value": dateStr
        });
    }
    if (metaball.CommitAuthor) {
        basicInfoItems.push({
            "name": "Commit Author",
            "value": metaball.CommitAuthor
        });
    }
    if (metaball.CommitHash) {
        basicInfoItems.push({
            "name": "Commit Hash",
            "value": metaball.CommitHash
        });
    }
    
    var themeColor = "32CD32";
    var validationErrorsLayerItems = [];
    if (metaball.ValidationErrorsDetected) {
        validationErrorsLayerItems = metaball.ValidationErrors
            .filter(function(layer) { return layer.Entries.length; })
            .map(function(layer) {
                var moduleNames = layer.Entries
                    .map(function(entry) { return entry.ModuleName; })
                    .filter(function(entry, idx, arr) { return arr.indexOf(entry) === idx}) // select distinct
                    .join(", ");

                return {
                    "name": layer.Name,
                    "value": moduleNames
                }
            });

        themeColor = "F00000";
    }

    var actionItems = [];
    if (metaball.DeployLink) {
        actionItems.push({
            "@type": "OpenUri",
            "name": "View Documentation",
            "targets": [
                {
                    "os": "default",
                    "uri": metaball.DeployLink
                }
            ]
        });
    }
    if (metaball.CommitLink) {
        actionItems.push({
            "@type": "OpenUri",
            "name": "View Commit",
            "targets": [
                {
                    "os": "default",
                    "uri": metaball.CommitLink
                }
            ]
        });
    }
    
    var card = {
        "@type": "MessageCard",
        "@context": "https://schema.org/extensions",
        "summary": "SitecoreDXG Generation Notification",
        "themeColor": themeColor,
        "title": "SitecoreDXG Generation Report",
        "sections": [
            {
                "facts": basicInfoItems
            },
            {
                "activityTitle": "**Validation Errors Detected**",
                "activitySubtitle": "Invalid dependencies were found in the following modules by layer:",
                "facts": validationErrorsLayerItems
            }
        ],
        "potentialAction": actionItems
    };
    
    request.post({ 
        url: params.Url, 
        headers: {'content-type' : 'application/json'},
        method: 'POST',
        json: card
    }, function optionalCallback(err, res) {
        if (err) {
            logger.error(`Error occurred while sending MS Teams notification: ${err}`);
        } else if (res.statusCode != 200) {
            logger.error(`Error occurred while posting MS Teams notification: { StatusCode: ${res.statusCode}, Message: "${res.statusMessage}", Readable: ${res.readable} Body: "${res.body}" }`);
        } else {
            logger.info("MS Teams notification sent");
        }
    });
};

/**
 * Registers the completion handler with the given CompletionHandlerManager - this function is required on all completion handler modules
 * @param {CompletionHandlerManager} completionHandlerManager the trigger manager to register the trigger for
 */
var registerCompletionHandler = function (completionHandlerManager) {
    completionHandlerManager.registerCompletionHandler(COMPLETIONHANDLER_ID, _execute);
};

exports.COMPLETIONHANDLER_ID = COMPLETIONHANDLER_ID;
exports.registerCompletionHandler = registerCompletionHandler;
