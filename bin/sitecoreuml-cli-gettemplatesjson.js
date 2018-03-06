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
var request = require("request");

commander
    .parse(process.argv);

var url = "http://local.sitecoreuml.com/sitecoreuml/template2/gettemplatearchitecture";
request.get(url, (error, response, body) => {
  var json = JSON.parse(body);
  console.log(json);
});