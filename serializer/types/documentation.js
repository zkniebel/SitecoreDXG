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
    GenerationSource: "GenerationSource",
    SolutionStatistics: "SolutionStatistics",
    HelixStatistics: "HelixStatistics",
    HelixLayerStatistics: "HelixLayerStatistics",
    HelixModuleStatistics: "HelixModuleStatistics"
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
 * @summary Holds statistics for a helix module of the solution
 * @param {string} moduleID ID of the module 
 * @param {number} totalTemplates the total number of templates in the module
 * @param {number} totalDependencies the total number of dependencies on other modules
 * @param {number} totalDependents the total number of dependents from other modules
 */
function HelixModuleStatistics(moduleID, totalTemplates, totalDependencies, totalDependents) {
    Entity.call(this, TypeNames.HelixModuleStatistics);
    /**
     * @property the ID of the module
     */
    this.ModuleID = moduleID;
    /**
     * @property the total number of templates in the layer
     */
    this.TotalTemplates = totalTemplates;
    /**
     * @property the total number of dependencies in the layer
     */
    this.TotalDependencies = totalDependencies;
    /**
     * @property the total number of dependents in the layer
     */
    this.TotalDependents = totalDependents;
};

/**
 * @summary Holds statistics for a helix layer of the solution
 * @param {string} layerID the ID of the layer
 * @param {Array<HelixModuleStatistics>} helixModuleStatistics array of HelixModuleStatistics objects representing the modules that belong to the layer
 */
function HelixLayerStatistics(layerID, helixModuleStatistics) {
    Entity.call(this, TypeNames.HelixLayerStatistics);
    /**
     * @property the reference ID of the layer root
     */
    this.LayerID = layerID;
    /**
     * @property array of HelixModuleStatistics objects representing the modules that belong to the layer
     */
    this.HelixModuleStatistics = helixModuleStatistics;
};
/**
 * @summary gets the total number of templates in the layer
 */
HelixLayerStatistics.prototype.getTotalTemplates = function() {
    return this.HelixModuleStatistics.reduce(function(accumulator, moduleStatistics) { 
        return accumulator + moduleStatistics.TotalTemplates; 
    }, 0);
};
/**
 * @summary gets the total number of modules in the layer
 */
HelixLayerStatistics.prototype.getTotalModules = function() {
    return this.HelixModuleStatistics.length;
};    
/**
 * @summary gets the total number of dependencies in the layer
 */
HelixLayerStatistics.prototype.getTotalModuleDependencies = function() {
    return this.HelixModuleStatistics.reduce(function(accumulator, moduleStatistics) { 
        return accumulator + moduleStatistics.TotalDependencies; 
    }, 0);
};
/**
 * @summary gets the total number of dependents in the layer
 */
HelixLayerStatistics.prototype.getTotalModuleDependents = function() {
    return this.HelixModuleStatistics.reduce(function(accumulator, moduleStatistics) { 
        return accumulator + moduleStatistics.TotalDependents; 
    }, 0);
};

/**
 * @summary Holds statistics about the helix elements of the solution
 * @param {HelixLayerStatistics} foundationLayerStatistics the statistics object for the foundation layer
 * @param {HelixLayerStatistics} featureLayerStatistics the statistics object for the feature layer
 * @param {HelixLayerStatistics} projectLayerStatistics the statistics object for the project layer
 */
function HelixStatistics(foundationLayerStatistics, featureLayerStatistics, projectLayerStatistics) {
    Entity.call(this, TypeNames.HelixStatistics);
    /**
     * @property foundation-layer statistics
     */
    this.FoundationLayer = foundationLayerStatistics;
    /**
     * @property feature-layer statistics
     */
    this.FeatureLayer = featureLayerStatistics;
    /**
     * @property project-layer statistics
     */
    this.ProjectLayer = projectLayerStatistics;

    var layersArray = [ foundationLayerStatistics, featureLayerStatistics, projectLayerStatistics ];

    /**
     * @property hashmap of IDs to layer statistics
     */    
    this.IDsToLayersMap = layersArray.reduce(function(map, layerStats) {
        map[layerStats.LayerID] = layerStats;
        return map;
    }, {});
    /**
     * @property hashmap of IDs to module statistics
     */    
    this.IDsToModulesMap = layersArray
        .reduce(function(arr, layerStats) { return arr.concat(layerStats.HelixModuleStatistics); }, [])
        .reduce(function(map, moduleStats) {
            map[moduleStats.ModuleID] = moduleStats;
            return map;
        }, {});
};
/**
 * @summary gets the total number of modules in the solution
 */
HelixStatistics.prototype.getTotalModules = function() {
    return this.FoundationLayer.getTotalModules() + this.FeatureLayer.getTotalModules() + this.ProjectLayer.getTotalModules();
};
/**
 * @summary gets the total number of helix templates in the solution 
 */
HelixStatistics.prototype.getTotalTemplates = function() {
    return this.FoundationLayer.getTotalTemplates() + this.FeatureLayer.getTotalTemplates() + this.ProjectLayer.getTotalTemplates();
};
/**
 * @summary gets the total number of module dependencies in the solution 
 */
HelixStatistics.prototype.getTotalModuleDependencies = function() {
    return this.FoundationLayer.getTotalModuleDependencies() + this.FeatureLayer.getTotalModuleDependencies() + this.ProjectLayer.getTotalModuleDependencies();
};
/**
 * @summary gets the total number of module dependents in the solution 
 */
HelixStatistics.prototype.getTotalModuleDependents = function() {
    return this.FoundationLayer.getTotalModuleDependents() + this.FeatureLayer.getTotalModuleDependents() + this.ProjectLayer.getTotalModuleDependents();
};

/**
 * @summary Holds statistics about the solution
 * @param {HelixStatistics} helixStatistics the optional HelixStatistics object representing the helix statistics of the solution
 */
function SolutionStatistics(helixStatistics = undefined) {
    Entity.call(this, TypeNames.SolutionStatistics);
    /**
     * @property total number of templates in the solution
     */
    this.TotalTemplates = 0;
    /**
     * @property total number of template folders in the solution
     */
    this.TotalTemplateFolders = 0;
    /**
     * @property total number of template fields in the solution
     */
    this.TotalTemplateFields = 0;
    /**
     * @property total number of template inheritance relationships in the solution
     */
    this.TotalTemplateInheritance = 0;
    /**
     * @property Helix statistics for the solution
     */
    this.HelixStatistics = helixStatistics;
};

/**
 * @summary Represents the ID map of a helix layer structure
 * @param {string} rootID the ID of the layer root folder
 * @param {string} helixLayerName the name of the helix layer
 * @param {Array<string>} moduleFolderIDs the IDs of the module folders
 */
function HelixLayerMap(rootID, helixLayerName, moduleFolderIDs = []) {
    Entity.call(this, TypeNames.HelixLayerMap);

    this.RootID = rootID;
    this.HelixLayerName = helixLayerName;
    this.ModuleFolderIDs = moduleFolderIDs;
};

HelixLayerMap.prototype = Object.create(Entity.prototype);
HelixLayerMap.prototype.constructor = HelixLayerMap;


/**
 * @summary Represents the ID map of a helix structure of a database
 * @param {string} databaseName the name of the database
 * @param {HelixLayerMap} foundationLayerMap layer map representing the structure of the foundation helix layer in the database
 * @param {HelixLayerMap} featureLayerMap layer map representing the structure of the feature helix layer in the database
 * @param {HelixLayerMap} projectLayerMap layer map representing the structure of the project helix layer in the database
 */
function HelixDatabaseMap(databaseName, foundationLayerMap, featureLayerMap, projectLayerMap) {
    Entity.call(this, TypeNames.HelixDatabaseMap);

    this.DatabaseName = databaseName;
    this.Foundation = foundationLayerMap;
    this.Feature = featureLayerMap;
    this.Project = projectLayerMap;
};

HelixDatabaseMap.prototype = Object.create(Entity.prototype);
HelixDatabaseMap.prototype.constructor = HelixDatabaseMap;


/**
 * @summary Represents the metadata for the documentation
 * @param {string} documentationTitle the title to use for the generated documentation
 * @param {string} projectName the name of the project
 * @param {string} environmentName the name of the environment
 * @param {string} commitAuthor the commit author
 * @param {string} commitHash the commit hash
 * @param {string} commitLink the URL to view the commit
 * @param {string} deployLink the URL to view the generated documentation
 */
function Metaball(documentationTitle = "", projectName = "", environmentName = "", commitAuthor = "", commitHash = "", commitLink = "", deployLink = "") {
    Entity.call(this, TypeNames.Metaball);

    /**
     * @property project name passed in the input data
     */
    this.ProjectName = projectName;
    /**
     * @property environment name passed in the input data
     */
    this.EnvironmentName = environmentName;
    /**
     * @property name of the author passed in the input data
     */
    this.CommitAuthor = commitAuthor;
    /**
     * @property commit hash passed in the input data
     */
    this.CommitHash = commitHash;
    /**
     * @property commit link passed in the input data
     */
    this.CommitLink = commitLink;
    /**
     * @property documentation title passed in the input data
     */
    this.DocumentationTitle = documentationTitle;
    /**
     * @property deploy link passed in the input data
     */
    this.DeployLink = deployLink;

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
    /**
     * @property Solution Statistics
     */
    this.SolutionStatistics = undefined;
};

Metaball.prototype = Object.create(Entity.prototype);
Metaball.prototype.constructor = Metaball;


/**
 * @summary Represents the source data to be used for generation
 * @param {Metaball} metaball the metadata for the generation 
 * @param {Array<Database>} databases array of databases holding the items in the solution 
 * @param {object} helixDatabaseMaps map of database names to their helix database maps
 * @param {Array<object>} completionHandlerConfigurations array of configurations for completion handlers to be run
 */
function GenerationSource(metaball, databases, helixDatabaseMaps = {}, completionHandlerConfigurations = undefined) {
    Entity.call(this, TypeNames.GenerationSource);

    metaball.HelixDatabaseMaps = helixDatabaseMaps;

    this.DocumentationConfiguration = metaball;
    this.Databases = databases;
    this.CompletionHandlerConfigurations = completionHandlerConfigurations;
};

GenerationSource.prototype = Object.create(Entity.prototype);
GenerationSource.prototype.constructor = GenerationSource;


/**
 * EXPORTS
 */

exports.Metaball = Metaball;
exports.HelixLayerMap = HelixLayerMap;
exports.HelixDatabaseMap = HelixDatabaseMap;
exports.GenerationSource = GenerationSource;
exports.SolutionStatistics = SolutionStatistics;
exports.HelixStatistics = HelixStatistics;
exports.HelixLayerStatistics = HelixLayerStatistics;
exports.HelixModuleStatistics = HelixModuleStatistics;

exports.TypeNames = TypeNames;
exports.HelixLayerNames = HelixLayerNames;