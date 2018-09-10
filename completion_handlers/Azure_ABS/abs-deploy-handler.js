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

// node
const fs = require("fs");
const path = require("path");


/**
 * CONSTANTS
 */

const COMPLETIONHANDLER_ID = "Azure_ABS";


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

    var _recursivelyDeployDirectoryToABS = function (directoryPath, targetFolderPath) {
        var __uploadFile = function(fileName) {
            return new Promise(function(resolve, reject) {
                // get the full path of the file
                const filePath = path.join(directoryPath, fileName);

                // recurse if it's a directory
                if (fs.lstatSync(filePath).isDirectory()) {
                    const targetABSFolderPath = _joinABSPath(targetFolderPath, fileName);
                    Promise.resolve(_recursivelyDeployDirectoryToABS(filePath, targetABSFolderPath))
                        .then(function(result) {
                            resolve(logger.info(`Deployment to "${targetABSFolderPath}" completed successfully`));
                        })
                        .catch(function(error) {
                            reject(logger.error(`Deployment to "${targetABSFolderPath}" resulted in an error`, error));  
                        });
                } else {
                    // create the target path of the file in the ABS share
                    const targetFilePath = _joinABSPath(targetFolderPath, fileName);

                    var mimetype = mime.lookup(filePath);

                    // upload file to ABS
                    blobService.createBlockBlobFromLocalFile(
                        azureStorageContainer,
                        targetFilePath,
                        filePath,
                        {
                            contentSettings: {
                                contentType: mimetype ? mimetype : undefined
                            }
                        },
                        function (error, result, response) {
                            if (error) {
                                reject(logger.error(error));
                            } else {
                                resolve(logger.info(`Successfully uploaded "${fileName}" to "${targetFilePath}".`));
                            }
                        }
                    );
                };
            });
        };

        return new Promise(function(resolve, reject) {
            fs.readdir(directoryPath, (err, files) => {
                if (!files || files.length === 0) {
                    resolve(logger.warn(`Provided folder "${directoryPath}" not found or empty.`));
                }

                Promise.all(files.map(__uploadFile))
                    .then(function(result) {
                        resolve(logger.info(`Deployment to "${directoryPath}" completed successfully`));
                    })
                    .catch(function(error) {
                        reject(logger.error(`Deployment to "${directoryPath}" resulted in an error`, error)); 
                    });
            });
        });
    };

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
                            Promise.resolve(_recursivelyDeployDirectoryToABS(outputDirectoryPath, azureStorageTargetDirectory))
                                .then(function(result) {
                                    logger.info(`Deployment completed successfully!`);
                                })
                                .catch(function(error) {
                                    logger.error(`Deployment resulted in an error:`, error); 
                                });
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
