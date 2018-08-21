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
    OutputDirectoryPath:    "C:\\SitecoreDXG\\Work",	// The root path where output files are stored (Default: "C:\\SitecoreDXG\\Work")
    LogsDirectoryPath:      "C:\\SitecoreDXG\\Logs",	// The path to where log files will be written (Default: "C:\\SitecoreDXG\\Logs")
    LogLevel:               "info", 					// The minimum priority level of log messages for them to be written to the log (Default: "info")
    Triggers: {                                         // The settings for the triggers
        RabbitMQ: {                                     // The settings for the RabbitMQ trigger
            TriggerID:      "RabbitMQ",                 // The ID of the RabbitMQ trigger 
            ConnectionString:                           // The connection string used to connect to the queue server
                            "amqp://localhost",
            DocumentationGenerationQueueName:           // The name of the documentation generation queue
                            "generation_queue__documentation",
            MDJGenerationQueueName:                     // The name of the MDJ file generation queue
                            "generation_queue__mdj"
        },
        Express: {                                      // The settings for the Express trigger
            TriggerID:      "Express",                  // The ID of the Express trigger 
            Port:           8023						// The port number that the API should listen on (Default: 8023)
        }
    },
    Trigger:                "RabbitMQ"                  // The name of the trigger that is to be used when the server is started
};

/**
 * EXPORTS
 */

exports.configuration = configuration;