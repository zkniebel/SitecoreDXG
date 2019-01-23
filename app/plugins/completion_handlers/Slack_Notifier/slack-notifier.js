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
const { IncomingWebhook } = require('@slack/client');


/**
 * CONSTANTS
 */

const COMPLETIONHANDLER_ID = "Slack_Notifier";


/**
 * FUNCTIONS
 */

/**
 * Executes the completion handler with the given output directory path 
 * @param {string} outputDirectoryPath the path to the output directory
 * @param {object} configurationLoader the configuration loader module
 * @param {object} metaball holds the metadata from the generation
 * @param {object} logger the logger
 * @param {Array<*>} params custom parameters object
 */
var _execute = function (outputDirectoryPath, configurationLoader, metaball, logger, params) {
    if (!params || !params.Url) {
        logger.error("Slack notifier requires a params object with a \"Url\" parameter as an argument");
        return;
    }

    var authorName = metaball.CommitHash;
    if (metaball.CommitAuthor) {
        authorName = authorName ? `${authorName} - ${metaball.CommitAuthor}` : metaball.CommitAuthor;
    }
    var authorLink = metaball.CommitLink;

    var basicInfoFields = [];
    if (metaball.ProjectName) {
        basicInfoFields.push({ "title": "Project", "value": metaball.ProjectName, "short": true });
    }
    if (metaball.EnvironmentName) {
        basicInfoFields.push({ "title": "Environment", "value": metaball.EnvironmentName, "short": true });
    }
    if (metaball.DocumentationTitle) {
        basicInfoFields.push({ "title": "Documentation Title", "value": metaball.DocumentationTitle, "short": false });
    }
    if (metaball.StartTime > 0) {
        basicInfoFields.push({ "title": "Started", "value": `<!date^${Math.round(metaball.StartTime / 1000)}^{date_short_pretty} at {time_secs}|Date format error>`, "short": true });
    }
    if (metaball.EndTime > 0) {
        basicInfoFields.push({ "title": "Completed", "value": `<!date^${Math.round(metaball.EndTime / 1000)}^{date_short_pretty} at {time_secs}|Date format error>`, "short": true });
    }

    var actions = metaball.DeployLink
        ? [{ "type": "button", "text": "View the Documentation", "url": metaball.DeployLink }]
        : [];

    var validationErrorsData = {};
    if (metaball.ValidationErrorsDetected) {
        var validationErrorFields = metaball.ValidationErrors
            .filter(function(layer) { return layer.Entries.length; })
            .map(function(layer) {
                var moduleNames = layer.Entries
                    .map(function(entry) { return entry.ModuleName; })
                    .filter(function(entry, idx, arr) { return arr.indexOf(entry) === idx}) // select distinct
                    .join("\n");

                return {
                    "title": layer.Name,
                    "value": moduleNames,
                    "short": true
                }
            });

        validationErrorsData = {
            "text": "*Validation Errors Detected*\nInvalid dependencies were found in the following modules by layer:",
            "color": "danger",
            "mrkdwn_in": [
                "text"
            ],
            "fields": validationErrorFields
        };
    }

    var notificationData = {
        "text": "Generation completion report",
        "attachments": [
            {
                "author_name": authorName,
                "author_link": authorLink,
                "color": "good",
                "mrkdwn_in": [],
                "fields": basicInfoFields,
                "actions": actions
            },
            validationErrorsData
        ]
    };
    
    var webhook = new IncomingWebhook(params.Url);

    webhook.send(notificationData, function (err, res) {
        if (err) {
            logger.error(`Error occurred while sending Slack notification: ${err}`);
        } else {
            logger.info("Slack notification sent");
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
