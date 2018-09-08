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
const mime = require("mime-types")

// node
const fs = require("fs"); // from node.js
const path = require("path"); // from node.js


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
var _execute = function (outputDirectoryPath, logger, params) {
    logger.info(`Executing AWS S3 Deployment Completion Handler on output path"${outputDirectoryPath}"`);

    var options = params[0];
    if (!options || !(options.AccessKeyId && options.SecretAccessKey && options.S3BucketName && options.S3FolderPath)) {
        logger.error("Error while executingthe AWS S3 completion handler. A JSON argument must be passed with the AccessKeyId, SecretAccessKey, S3BucketName, and S3FolderPath properties set.");
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

    var recursivelyDeployDirectoryToS3 = function (directoryPath, targetFolderPath) {
        // get files in directory and deploy them
        fs.readdir(directoryPath, (err, files) => {
            if (!files || files.length === 0) {
                logger.warn(`Provided folder "${directoryPath}" not found or empty.`);
                return;
            }

            // loop through the files in the directory and deploy each
            for (const fileName of files) {

                // get the full path of the file
                const filePath = path.join(directoryPath, fileName);

                // recurse if it's a directory
                if (fs.lstatSync(filePath).isDirectory()) {
                    const targetS3FolderPath = joinS3Path(targetFolderPath, fileName);
                    recursivelyDeployDirectoryToS3(filePath, targetS3FolderPath);
                    continue;
                }

                // read file into buffer and upload to s3
                fs.readFile(filePath, (error, fileContent) => {
                    if (error) {
                        logger.error(error);
                        return;
                    }

                    // create the target path of the file in the s3 bucket
                    const targetFilePath = joinS3Path(targetFolderPath, fileName);

                    var mimetype = mime.lookup(filePath);

                    //upload file to S3
                    s3.upload({
                        Bucket: s3BucketName,
                        Key: targetFilePath,
                        Body: fileContent,
                        ContentType: mimetype ? mimetype : undefined
                    }, (err) => {
                        if (err) {
                            logger.error(err);
                            return;
                        } else {
                            logger.info(`Successfully uploaded "${fileName}" to "${targetFilePath}".`);
                        }
                    });

                });
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
                        recursivelyDeployDirectoryToS3(outputDirectoryPath, s3FolderPath);
                    }
                });
            } else {
                // start the initial recursive deployment for the folder path
                recursivelyDeployDirectoryToS3(outputDirectoryPath, s3FolderPath);
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
