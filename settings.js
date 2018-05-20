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
 * EXPORTS
 */

exports = {
    Port:                   8023,						// The port number that the API should listen on (Default: 8023)
    OutputDirectoryPath:    "C:\\SitecoreDXG\\Work",	// Holds the root path where output files are stored (Default: "C:\\SitecoreDXG\\Work")
    LogsDirectoryPath:      "C:\\SitecoreDXG\\Logs",	// Holds the path to where log files will be written (Default: "C:\\SitecoreDXG\\Logs")
    LogLevel:               "info"						// Holds the minimum priority level of log messages for them to be written to the log (Default: "info")
};