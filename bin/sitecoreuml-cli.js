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
 * Module dependencies.
 */

var commander = require("commander");
var pjson = require('../package.json');

function task(task) {
    console.log("run " + task);
}

commander
    .version(pjson.version)
    .usage("[command] [options]")
    .command("gettemplatesjson", "get the templates in their folder structure as JSON from Sitecore")
    .command("generatemdjfile", "get the template architecture as JSON from Sitecore and generate a MetaData-Json file from it")
    // .command("html", "generate HTML document")
    .option("-r, --run <task>", "run a specified task", task)
    .parse(process.argv);