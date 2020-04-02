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
 * SETTINGS
 */

const configuration = {
    OutputDirectoryPath:    "C:\\SitecoreDXG\\Work",	// The root path where output files are stored - will be created if it doesn't exist (Default: "C:\\SitecoreDXG\\Work")
    LogsDirectoryPath:      "C:\\SitecoreDXG\\Logs",	// The path to where log files will be written - will be created if it doesn't exist (Default: "C:\\SitecoreDXG\\Logs")
    LogLevel:               "info", 					// The minimum priority level of log messages for them to be written to the log (Default: "info")
    DefaultCompletionHandlers:                          // The completion handler ID-Parameters objects representing the completion handlers to be called after generation is complete
                            [ ],                        //   NOTE: this should be an array of objects similar to the following [{ ID: "MyCompletionHandler1", Params: [] }, { ID: "MyCompletionHandler2", Params: ["foo", 1, "bar"] }] 
    CompletionHandlers:     {                           // The settings for the completion handlers
        AWSS3Deploy: {                                  // The settings for the AWS S3 Deploy completion handler
            MaxConcurrency: 250                         // The maximum number of files to be opened/uploaded at any given time (Default: 250)
                                                        //   NOTE: this is limited by the OS, and most either limit to 256 or 10K files open at a given time. If you set the limit too high, you may end up receiving errors due to having too many files open
        },
        AzureBlobStorageDeploy: {                       // The settings for the Azure Blob Storage Deploy completion handler
            MaxConcurrency: 250                         // The maximum number of files to be opened/uploaded at any given time (Default: 250)
                                                        //   NOTE: this is limited by the OS, and most either limit to 256 or 10K files open at a given time. If you set the limit too high, you may end up receiving errors due to having too many files open
        }
    },
    Triggers: {                                         // The settings for the triggers
        RabbitMQ: {                                     // The settings for the RabbitMQ trigger
            ConnectionString:                           // The connection string used to connect to the queue server
                            "amqp://localhost?heartbeat=60",
            DocumentationGenerationQueueName:           // The name of the documentation generation queue
                            "generation_queue__documentation",
            MDJGenerationQueueName:                     // The name of the MDJ file generation queue
                            "generation_queue__mdj",
            ValidationGenerationQueueName:              // The nae of the validation generation queue
                            "generation_queue__validation"
        },
        Express: {                                      // The settings for the Express trigger
            Port:           8023						// The port number that the API should listen on (Default: 8023)
        }
    },
    Trigger:                "JobQueue"                  // The name of the trigger that is to be used when the server is started
};

/**
 * EXPORTS
 */

exports.configuration = configuration;