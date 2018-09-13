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
const AWS = require("aws-sdk"); 
const mime = require("mime-types");
const async = require("async");
const glob = require("glob");

// node
const fs = require("fs");
const path = require("path"); 


/**
 * CONSTANTS
 */

const COMPLETIONHANDLER_ID = "AWS_S3";


/**
 * FUNCTIONS
 */

/**
 * Executes the completion handler with the given output directory path 
 * @param {string} outputDirectoryPath the path to the output directory
 * @param {object} logger the logger
 * @param {Array<*>} params array of custom parameters
 */
var _execute = function (outputDirectoryPath, configurationLoader, logger, params) {
    logger.info(`Executing AWS S3 Deployment Completion Handler on output path "${outputDirectoryPath}"`);
    
    const configuration = configurationLoader.getConfiguration();
    var async_concurrency;
    try {
        async_concurrency = configuration.CompletionHandlers.AWSS3Deploy.MaxConcurrency;
    } catch (e) {
        async_concurrency = 250;
    }

    var options = params[0];
    if (!options || !(options.AccessKeyId && options.SecretAccessKey && options.S3BucketName && options.S3FolderPath)) {
        logger.error("Error while executing the AWS S3 Deployment Completion Handler. A JSON argument must be passed with the AccessKeyId, SecretAccessKey, S3BucketName, and S3FolderPath properties set.");
        return;
    }

    const accessKeyId = options.AccessKeyId;
    const secretAccessKey = options.SecretAccessKey;
    const s3BucketName = options.S3BucketName;
    const s3FolderPath = options.S3FolderPath;

    // initialize S3 client
    const s3 = new AWS.S3({
        signatureVersion: 'v4',
        accessKeyId: accessKeyId,
        secretAccessKey: secretAccessKey
    });

    var joinS3Path = function (path1, path2) {
        // replace all of the \ with / so that s3 parses the folders in the path
        return path.join(path1, path2)
            .replace(/\\/g, "/");
    };

    var deployDirectoryToS3 = function (directoryPath) {
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
    
                //upload file to S3
                s3.upload({
                    Bucket: s3BucketName,
                    Key: task.TargetPath,
                    Body: fileContent,
                    ContentType: mimetype ? mimetype : undefined
                }, (err) => {
                    if (err) {
                        hasErrors = true;
                    }
                    callback(err);
                });    
            });
        }, async_concurrency);

        fileDeploymentQueue.drain = function() {
            if (hasErrors) {
                logger.error("File deployment to AWS S3 completed with errors");
            } else {
                logger.info("File deployment to AWS S3 completed successfully!");
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
            const targetFilePath = joinS3Path(s3FolderPath, relativeFilePath);

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
    };

    // ensure that the deployment is clean by removing any files that weren't overwritten in the deployment
    var cleanDeployFiles = function () {
        s3.listObjects({
            Bucket: s3BucketName,
            Prefix: joinS3Path(s3FolderPath, "/")
        }, function (err, data) {
            if (err) {
                logger.error(err);
                return;
            };

            const isTruncated = data.IsTruncated;

            //get the array of the files that exist in s3
            const existingFilesInS3 = data.Contents.map(function (entry) { return { Key: entry.Key }; });

            if (data.Contents.length) {
                s3.deleteObjects({
                    Bucket: s3BucketName,
                    Delete: { Objects: existingFilesInS3 }
                }, function (err, data) {
                    if (err) {
                        logger.error(err);
                        return;
                    }

                    // if the listed files were truncated then not everything has been deleted so start again
                    if (isTruncated) {
                        cleanDeployFiles();
                    } else {
                        // start the initial recursive deployment for the folder path
                        deployDirectoryToS3(outputDirectoryPath);
                    }
                });
            } else {
                // start the initial recursive deployment for the folder path
                deployDirectoryToS3(outputDirectoryPath);
            }
        });
    };

    cleanDeployFiles();
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
