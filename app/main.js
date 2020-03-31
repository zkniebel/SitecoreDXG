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

// third-party
const glob = require("glob");

// local
const configurationLoader = require("./common/configuration-loader.js");
const completionHandlerManager = require("./generator/completion-handler-manager.js").completionHandlerManager;
const triggerManager = require("./generator/trigger-manager.js").triggerManager;

/**
 * CONSTANTS
 */

const configuration = configurationLoader.getConfiguration();

/**
 * REGISTER COMPLETION HANDLERS
 */

glob.sync("./plugins/completion_handlers/**{,!(node_modules)/**}*.js").forEach(function(file) {
    var completionHandler = require(path.resolve(file));
    completionHandler.registerCompletionHandler(completionHandlerManager);
});

/**
 * REGISTER TRIGGERS
 */

glob.sync("./plugins/triggers/**{,!(node_modules)/**}*.js").forEach(function(file) {
    var trigger = require(path.resolve(file));
    trigger.registerTrigger(triggerManager);
});

/**
 * INITIALIZE SELECTED TRIGGER
 */

triggerManager.initializeTrigger(configuration.Trigger);




/** 
 * TESTING
 */

const fs = require("fs");
const generation = require("./generator/generation.js");
const logger = require("./common/logging.js").logger;
const unicorn_converter = require("../serializer/converters/unicorn-converter.js");

const unicornSourcesGlob = "C:/Dev/Habitat/src/**/serialization{,/!(Roles)/**}/*.yml";

const masterDatabaseName = "master";
const databaseNames = [ masterDatabaseName ];
var sitecoreDatabases = unicorn_converter.readAndParseDatabases(unicornSourcesGlob, databaseNames);

const Documentation_Types = require("../serializer/types/documentation.js");
var metaball = new Documentation_Types.Metaball(
    "Habitat",
    "SitecoreDXG 2.0 Testing",
    "Local",
    "zkniebel",
    "faa8d71050a599b189a8b9f47cb50a389cf400ba",
    "https://github.com/zkniebel/SitecoreDXG/commit/faa8d71050a599b189a8b9f47cb50a389cf400ba");

var masterHelixDatabaseMap = new Documentation_Types.HelixDatabaseMap(
    masterDatabaseName,
    new Documentation_Types.HelixLayerMap(
        "B26BD035-8D0A-4DF3-8F67-2DE3C7FDD74A".toLowerCase(),
        Documentation_Types.HelixLayerNames.Foundation,
        "393E4EE8-4160-4467-8D42-371FF6A38354|4B333E08-BBB7-48AD-8150-8203BE0CB77C|ADCF25DC-5993-4C20-8204-83DE5A35CBCB|E422EBC8-55CA-40A7-A66A-EB592084516A|7681CF47-9D26-476F-A395-42C0C8D4F18F|7C610278-908F-487C-B32E-C81696D43396|DF639DE8-C9E7-4B18-967E-B1A14A8FF221|53A22396-4581-459D-80D6-47135E1F6F3B|5FD62CDC-BD6E-408C-B88F-9D9C41462CD8|16E64A6E-34A7-42F3-8678-010CC5E4FB39|197A3308-E54C-4E72-944C-A4885C6297E3"
            .toLowerCase()
            .split("|")),
    new Documentation_Types.HelixLayerMap(
        "8F343079-3CC5-4EF7-BC27-32ADDB46F45E".toLowerCase(),
        Documentation_Types.HelixLayerNames.Feature,
        "393E4EE8-4160-4467-8D42-371FF6A38354|4B333E08-BBB7-48AD-8150-8203BE0CB77C|ADCF25DC-5993-4C20-8204-83DE5A35CBCB|E422EBC8-55CA-40A7-A66A-EB592084516A|7681CF47-9D26-476F-A395-42C0C8D4F18F|7C610278-908F-487C-B32E-C81696D43396|DF639DE8-C9E7-4B18-967E-B1A14A8FF221|53A22396-4581-459D-80D6-47135E1F6F3B|5FD62CDC-BD6E-408C-B88F-9D9C41462CD8|16E64A6E-34A7-42F3-8678-010CC5E4FB39|197A3308-E54C-4E72-944C-A4885C6297E3"
            .toLowerCase()
            .split("|")),
    new Documentation_Types.HelixLayerMap(
        "825B30B4-B40B-422E-9920-23A1B6BDA89C".toLowerCase(),
        Documentation_Types.HelixLayerNames.Project,
        "393E4EE8-4160-4467-8D42-371FF6A38354|4B333E08-BBB7-48AD-8150-8203BE0CB77C|ADCF25DC-5993-4C20-8204-83DE5A35CBCB|E422EBC8-55CA-40A7-A66A-EB592084516A|7681CF47-9D26-476F-A395-42C0C8D4F18F|7C610278-908F-487C-B32E-C81696D43396|DF639DE8-C9E7-4B18-967E-B1A14A8FF221|53A22396-4581-459D-80D6-47135E1F6F3B|5FD62CDC-BD6E-408C-B88F-9D9C41462CD8|16E64A6E-34A7-42F3-8678-010CC5E4FB39|197A3308-E54C-4E72-944C-A4885C6297E3"
            .toLowerCase()
            .split("|")));

var helixDatabaseMaps = {};
helixDatabaseMaps[masterDatabaseName] = masterHelixDatabaseMap;

var generationSource = new Documentation_Types.GenerationSource(
    metaball,
    sitecoreDatabases,
    helixDatabaseMaps);

generation.generateDocumentation(
    generationSource,
    function (mdjPath, targetFileName, targetFolderPath, targetFilePath) {
      logger.info(`Metadata-JSON file saved to: "${targetFilePath}"`);
      logger.info(`Generation completed successfully!`);
    },
    function (error) {
      logger.error(`Generation failed with error: "${error}"`);
    }
);

