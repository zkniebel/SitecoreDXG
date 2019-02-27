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
    return this.HelixModuleStatistics.reduce(function(accumulator, helixModuleStatistics) { 
        return accumulator + helixModuleStatistics.TotalTemplates; 
    });
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
    return this.HelixModuleStatistics.reduce(function(accumulator, helixModuleStatistics) { 
        return accumulator + helixModuleStatistics.TotalDependencies; 
    });
};
/**
 * @summary gets the total number of dependents in the layer
 */
HelixLayerStatistics.prototype.getTotalModuleDependents = function() {
    return this.HelixModuleStatistics.reduce(function(accumulator, helixModuleStatistics) { 
        return accumulator + helixModuleStatistics.TotalDependents; 
    });
};

/**
 * @summary Holds statistics about the helix elements of the solution
 * @param {HelixLayerStatistics} foundationLayerStatistics the statistics object for the foundation layer
 * @param {HelixLayerStatistics} featureLayerStatistics the statistics object for the feature layer
 * @param {HelixLayerStatistics} projectLayerStatistics the statistics object for the project layer
 */
function HelixStatistics(foundationLayerStatistics, featureLayerStatistics, projectLayerStatistics) {
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
            map[moduleStats.LayerID] = moduleStats;
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
 * @summary Holds the metadata for the generation
 */
function Metaball() {
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


exports.Metaball = Metaball;
exports.SolutionStatistics = SolutionStatistics;
exports.HelixStatistics = HelixStatistics;
exports.HelixLayerStatistics = HelixLayerStatistics;
exports.HelixModuleStatistics = HelixModuleStatistics;