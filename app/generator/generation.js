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

// local
const configurationLoader = require("../common/configuration-loader.js");
const logger = require("../common/logging.js").logger;
const mdjre = require("./mdj-reverseengineer.js");
const Documentation_Types = require("../../serializer/types/documentation.js");
const completionHandlerManager = require("./completion-handler-manager.js").completionHandlerManager;

/**
 * PROPERTIES
 */

const configuration = configurationLoader.getConfiguration();

/**
 * EXECUTION
 */

/**
 * Generates the meta-data json file (.MDJ) based on the given architecture
 * @param {Documentation_Types.GenerationSource} generationSource the source data generate documentation from
 * @param {function} successCallback function to call if the generation is successful
 * @param {function} errorCallback function to call if the generation fails
 */
const generateMetaDataJson = function(generationSource, successCallback, errorCallback) {
    // create the metaball to hold the meta data for the generation
    var metaball = new Documentation_Types.Metaball();

    // create the target file path at which the output file will be stored
    var targetFolderPath = configuration.createBucketedOutputSubdirectoryPath(true);
    var targetFileName = "Architecture.mdj";
    var targetFilePath = path.join(targetFolderPath, targetFileName);

    // TODO: change this to a loop over the databases when support for multiple databases is added
    var database = generationSource.Databases[0];
    var helixDatabaseMap = generationSource.DocumentationConfiguration.HelixDatabaseMaps[database.Name];

    try {      
        var mdjPath = mdjre.reverseEngineerMetaDataJsonFile(
            database, 
            targetFilePath, 
            generationSource.DocumentationConfiguration,
            helixDatabaseMap);
        logger.info(`Generated MDJ file at path "${mdjPath}"`);
    } catch (error) {
        logger.error(error); 
        
        if (errorCallback) {               
            errorCallback(error);
        }

        return;
    }

    if (successCallback) {
        successCallback(mdjPath, targetFileName, targetFolderPath, targetFilePath);
    }

    // generation completed
    metaball.EndTime = Date.now();

    // call the completion handlers
    var completionHandlers = generationSource.CompletionHandlerConfigurations || configuration.DefaultCompletionHandlers; 
    completionHandlerManager.callCompletionHandlers(completionHandlers, targetFolderPath, metaball);
};

/**
 * Generates the HTML documentation and meta-data json file (.MDJ) based on the given architecture
 * @param {Documentation_Types.GenerationSource} generationSource the source data generate documentation from
 * @param {function} successCallback function to call if the generation is successful
 * @param {function} errorCallback function to call if the generation fails
 */
const generateDocumentation = function(generationSource, successCallback, errorCallback) {
    // create the target file path at which the output file will be stored
    var targetFolderPath = configuration.createBucketedOutputSubdirectoryPath(true);
    var targetMdjFileName = "Architecture.mdj";
    var targetMdjFilePath = path.join(targetFolderPath, targetMdjFileName);
    var targetHtmlDocFolderName = "Html_Docs";
    var targetHtmlDocFolderPath = path.join(targetFolderPath, targetHtmlDocFolderName);
    var targetArchiveFileName = targetHtmlDocFolderName + ".zip";
    var targetArchiveFilePath = path.join(targetFolderPath, targetArchiveFileName);    

    // TODO: change this to a loop over the databases when support for multiple databases is added
    var database = generationSource.Databases[0];
    var helixDatabaseMap = generationSource.DocumentationConfiguration.HelixDatabaseMaps[database.Name];

    try {
        mdjre.reverseEngineerMetaDataJsonFile(
            database, 
            targetMdjFilePath, 
            generationSource.DocumentationConfiguration,
            helixDatabaseMap);
        logger.info("Generating HTML Documentation...");
        mdjre.generateHtmlDocumentationArchive(
            targetMdjFilePath,
            targetHtmlDocFolderPath,
            targetArchiveFilePath,
            function () {
                logger.info(`Archive zipped and saved at path "${targetArchiveFilePath}".`);

                if (successCallback) {
                    successCallback(targetArchiveFilePath, targetArchiveFileName, targetFolderPath, targetHtmlDocFolderPath, targetMdjFilePath);
                }

                // generation completed
                metaball.EndTime = Date.now();

                // call the completion handlers
                var completionHandlers = generationSource.CompletionHandlerConfigurations || configuration.DefaultCompletionHandlers; 
                completionHandlerManager.callCompletionHandlers(completionHandlers, targetFolderPath, metaball);
            },
            function (error) {
                logger.error(error);
                
                if (errorCallback) {
                    errorCallback(error);
                }
            });
    } catch (error) {
        logger.error(error);
                
        if (errorCallback) {
            errorCallback(error);
        }

        return;
    }
};

exports.generateMetaDataJson = generateMetaDataJson;
exports.generateDocumentation = generateDocumentation;