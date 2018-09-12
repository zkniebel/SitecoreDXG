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
const azure = require("azure-storage");
const mime = require("mime-types");
const async = require("async");
const glob = require("glob");

// node
const fs = require("fs");
const path = require("path");


/**
 * CONSTANTS
 */

const COMPLETIONHANDLER_ID = "Azure_ABS";
const ASYNC_CONCURRENCY = 250;


/**
 * FUNCTIONS
 */

/**
 * Executes the completion handler with the given output directory path 
 * @param {string} outputDirectoryPath the path to the output directory
 * @param {object} logger the logger
 * @param {Array<*>} params array of custom parameters
 */
var _execute = function (outputDirectoryPath, logger, params) {
    logger.info(`Executing Azure Blob Storage Deployment Completion Handler on output path "${outputDirectoryPath}"`);

    var options = params[0];
    if (!options || !(options.AzureStorageAccountConnectionString && options.AzureStorageContainer)) {
        logger.error("Error while executing the Azure Blob Storage Deployment Completion Handler. A JSON argument must be passed with the AzureStorageAccountConnectionString and AzureStorageContainer properties set.");
        return;
    }

    const azureStorageAccountConnectionString = options.AzureStorageAccountConnectionString;
    const azureStorageContainer = options.AzureStorageContainer;
    const azureStorageTargetDirectory = options.AzureStorageTargetDirectory || "";

    // initialize the retry policy    
    var retryOperations = new azure.LinearRetryPolicyFilter();

    // initialize ABS service
    const blobService = azure.createBlobService(azureStorageAccountConnectionString)
        .withFilter(retryOperations);

    var _joinABSPath = function (path1, path2) {
        // replace all of the \ with / so that ABS parses the folders in the path
        return path.join(path1, path2)
            .replace(/\\/g, "/");
    };

    var _deployDirectoryToABS = function (directoryPath) {
        var hasErrors = false;

        var fileDeploymentQueue = async.queue(function(task, callback) {            
            // read file into buffer and upload to s3
            fs.readFile(task.LocalPath, (error, fileContent) => {
                if (error) {
                    hasErrors = true;
                    callback(error);
                    return;
                }

                var mimetype = mime.lookup(task.LocalPath);

                // upload file to ABS
                blobService.createBlockBlobFromLocalFile(
                    azureStorageContainer,
                    task.TargetPath,
                    task.LocalPath,
                    {
                        contentSettings: {
                            contentType: mimetype ? mimetype : undefined
                        }
                    },
                    function (err) {
                        if (err) {
                            hasErrors = true;
                        }
                        callback(err);
                    }
                ); 
            });
        }, ASYNC_CONCURRENCY);

        fileDeploymentQueue.drain = function() {
            if (hasErrors) {
                logger.error("File deployment to Azure Blob Storage completed with errors");
            } else {
                logger.info("File deployment to Azure Blob Storage completed successfully!");
            }
        };

        // get files in directory and deploy them
        var sourceGlob = directoryPath.replace(/\\/g, "/");
        sourceGlob += sourceGlob.endsWith("/")
            ? "**/*"
            : "/**/*";

        var filesToDeploy = glob.sync(sourceGlob, { nodir: true }).map(function(filePath) {    
            // create the target path of the file in the s3 bucket
            const relativeFilePath = path.relative(directoryPath, filePath);
            const targetFilePath = _joinABSPath(azureStorageTargetDirectory, relativeFilePath);

            return { LocalPath: filePath, TargetPath: targetFilePath };
        });

        fileDeploymentQueue.push(filesToDeploy, function(error) {
            if (error) {
                logger.error(`An error occurred while uploading file "${this.data.LocalPath}" to "${this.data.TargetPath}"`);
                logger.error(error);
            } else {
                logger.info(`Successfully uploaded "${this.data.LocalPath}" to "${this.data.TargetPath}".`);
            }
        });
    }

    // ensure that the deployment is clean by removing any files that weren't overwritten in the deployment
    var _cleanDeployFiles = function () {
        const __deleteFile = function (fileName) {
            return new Promise(function (resolve, reject) {
                blobService.deleteBlob(
                    azureStorageContainer,
                    fileName, 
                    function(error, response) {
                        if (error) {
                            reject(logger.error(error));
                        } else {
                            resolve(logger.info(`Deleted '${fileName}' from Azure Storage`));
                        }
                    }
                );
            });
        };

        var filesToDelete = [];
        var __recursivelyCleanAndDeployFiles = function (continuationToken) {
            blobService.listBlobsSegmentedWithPrefix(
                azureStorageContainer,
                azureStorageTargetDirectory,
                continuationToken,
                function (error, result, response) {
                    if (error) {
                        logger.error(error);
                        return;
                    }

                    // add the returned files to the list of files to delete
                    filesToDelete = filesToDelete.concat(result.entries.map(function(entry) { return entry.name; }));

                    // if the result set was truncated then recurse and stop (all files must be deleted at the end)
                    if (result.continuationToken) {
                        __recursivelyCleanAndDeployFiles(result.continuationToken);
                        return;
                    }

                    // delete the returned files that exist in ABS
                    Promise.all(filesToDelete.map(__deleteFile))
                        .then(function(result) {
                            logger.info("Deletion completed!");
                            logger.info("Beginning deployment...");

                            // start the initial recursive deployment for the folder path
                            _deployDirectoryToABS(outputDirectoryPath);
                        })
                        .catch(function(error) {
                            logger.error("Deletion error occurred:", error);
                        });
                }
            );
        };

        __recursivelyCleanAndDeployFiles();
    };

    _cleanDeployFiles();
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
