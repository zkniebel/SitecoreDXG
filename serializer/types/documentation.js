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

// local
const { Entity } = require("./object.js");


/**
 * ENUMS
 */

/**
 * @summary Type names of Sitecore object types
 */
const TypeNames = {
    HelixLayerMap: "HelixLayerMap",
    HelixDatabaseMap: "HelixDatabaseMap",
    Metaball: "Metaball",
    GenerationSource: "GenerationSource"
};

/**
 * @summary Helix layer names
 */
const HelixLayerNames = {
    Foundation: "Foundation",
    Feature: "Feature",
    Project: "Project"
};

/**
 * TYPES
 */

/**
 * @summary Represents the ID map of a helix layer structure
 * @param {string} rootID the ID of the layer root folder
 * @param {Array<string>} moduleFolderIDs the IDs of the module folders
 */
function HelixLayerMap(rootID, moduleFolderIDs = []) {
    Entity.call(this, TypeNames.HelixLayerMap);

    this.RootID = rootID;
    this.ModuleFolderIDs = moduleFolderIDs
};

HelixLayerMap.prototype = Object.create(Entity.prototype);
HelixLayerMap.prototype.constructor = HelixLayerMap;


/**
 * @summary Represents the ID map of a helix structure of a database
 * @param {string} databaseName the name of the database
 * @param {Array<HelixLayerMap>} helixLayers the layer maps representing the structure of the helix layers in the database
 */
function HelixDatabaseMap(databaseName, helixLayers = []) {
    Entity.call(this, TypeNames.HelixDatabaseMap);

    this.DatabaseName = databaseName;
    this.HelixLayers = helixLayers;
};

HelixDatabaseMap.prototype = Object.create(Entity.prototype);
HelixDatabaseMap.prototype.constructor = HelixDatabaseMap;


/**
 * @summary Represents the metadata for the documentation
 * @param {string} DocumentationTitle the title to use for the generated documentation
 * @param {string} ProjectName the name of the project
 * @param {string} EnvironmentName the name of the environment
 * @param {string} CommitAuthor the commit author
 * @param {string} CommitHash the commit hash
 * @param {string} CommitLink the URL to view the commit
 * @param {string} DeployLink the URL to view the generated documentation
 */
function Metaball(DocumentationTitle = "", ProjectName = "", EnvironmentName = "", CommitAuthor = "", CommitHash = "", CommitLink = "", DeployLink = "") {
    Entity.call(this, TypeNames.Metaball);

    /**
     * @property project name passed in the input data
     */
    this.ProjectName = "";
    /**
     * @property environment name passed in the input data
     */
    this.EnvironmentName = "";
    /**
     * @property name of the author passed in the input data
     */
    this.CommitAuthor = "";
    /**
     * @property commit hash passed in the input data
     */
    this.CommitHash = "";
    /**
     * @property commit link passed in the input data
     */
    this.CommitLink = "";
    /**
     * @property documentation title passed in the input data
     */
    this.DocumentationTitle = "";
    /**
     * @property deploy link passed in the input data
     */
    this.DeployLink = "";

    /**
     * @property dictionary mapping helix layer names (as keys) to their respective helix database maps in the source
     */
    this.HelixDatabaseMaps = {};

    /**
     * @property set to [true] if validation errors were detected; otherwise [false] 
     */
    this.ValidationErrorsDetected = false;
    /**
     * @property validation error objects
     */
    this.ValidationErrors = [];
    /**
     * @property generation start time
     */
    this.StartTime = Date.now();
    /**
     * @property generation end time
     */
    this.EndTime = -1;
};

Metaball.prototype = Object.create(Entity.prototype);
Metaball.prototype.constructor = Metaball;


/**
 * @summary Represents the source data to be used for generation
 * @param {Metaball} metaball the metadata for the generation 
 * @param {Array<Database>} databases array of databases holding the items in the solution 
 */
function GenerationSource(metaball, databases, helixDatabaseMaps = []) {
    Entity.call(this, TypeNames.GenerationSource);

    metaball.HelixDatabaseMaps = helixDatabaseMaps;

    this.DocumentationConfiguration = metaball;
    this.Databases = databases;
};

GenerationSource.prototype = Object.create(Entity.prototype);
GenerationSource.prototype.constructor = GenerationSource;


/**
 * EXPORTS
 */

exports.Metaball = Metaball;
exports.GenerationSource = GenerationSource;

exports.TypeNames = TypeNames;
exports.HelixLayerNames = HelixLayerNames;