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
const fs = require("fs");
const path = require("path");

// third-party
const glob = require("glob");
const yaml = require("js-yaml");

// local
const sitecore_constants = require("../constants/sitecore.js");
const { Template, TemplateSection, TemplateField, TemplateFolder, StandardValues, Database } = require("../types/sitecore.js");


/**
 * FUNCTIONS
 */

 /**
  * @summary parses a Sitecore item tree object from the given list of Sitecore object data
  * @param {Array<object>} unicornObjects array of objects from Unicorn  
  */
var _parseSitecoreItemTree = function(unicornObjects) {
    var sitecoreTree = {};
    var sitecoreItems = [];
    
    var getSharedUnicornFieldValue = function(unicornObj, fieldID) {
        var sharedFields = unicornObj.SharedFields;
        if (!sharedFields || !sharedFields.length) {
            return undefined;
        }
    
        var field = sharedFields.find(function(field) { return field.ID == fieldID; });
        return field ? field.Value : undefined;
    };
    
    unicornObjects.forEach(function (obj, idx, arr) {
        var item;
    
        // get the parent (if exists)
        var parent = sitecoreItems[obj.Parent];
    
        if (obj.Template == sitecore_constants.TEMPLATE_FOLDER_TEMPLATE_ID || obj.Template == sitecore_constants.FOLDER_TEMPLATE_ID) {
            item = new TemplateFolder(obj.ID, obj.Template, parent, obj.Path);
            
            if (!parent) {  // if root folder add to tree
                sitecoreTree[item.ID] = item;
                sitecoreItems[item.ID] = item;
            } else if (parent instanceof TemplateFolder) {
                parent.Children.push(item);
                sitecoreItems[item.ID] = item;
            } else {
                throw `TemplateFolder parent must be a TemplateFolder unless the folder is at the root or layer root - item: ${item.ID} - "${item.Path}"`
            }
        } else if (obj.Template == sitecore_constants.TEMPLATE_TEMPLATE_ID) {    
            var baseTemplatesFieldValue = getSharedUnicornFieldValue(obj, sitecore_constants.TEMPLATE_BASE_TEMPLATE_FIELD_ID);
            var baseTemplates = baseTemplatesFieldValue 
                ? baseTemplatesFieldValue.split("\n")
                : [];
    
            item = new Template(obj.ID, obj.Template, parent, obj.Path, baseTemplates);
    
            if (!parent) { 
                sitecoreTree[item.ID] = item;
                sitecoreItems[item.ID] = item;
            } else if (parent instanceof TemplateFolder) {
                parent.Children.push(item);
                sitecoreItems[item.ID] = item;
            } else {
                throw `Template parent must be a Template folder unless the template is at the root or layer root - item: ${item.ID} - "${item.Path}"`;
            }
        } else if (obj.Template == sitecore_constants.TEMPLATE_SECTION_TEMPLATE_ID) {
            item = new TemplateSection(obj.ID, obj.Template, parent, obj.Path);
    
            if (!parent) { // usually means template section was added to native Sitecore template
                sitecoreTree[item.ID] = item;
                sitecoreItems[item.ID] = item;
            } else if (!(parent instanceof Template)) {
                throw `TemplateSection parent must be a Template - item: ${item.ID} - "${item.Path}"`;
            } else {
                parent.TemplateSections.push(item);
                sitecoreItems[item.ID] = item;
            }
        } else if (obj.Template == sitecore_constants.TEMPLATE_FIELD_TEMPLATE_ID) {      
            var fieldType = getSharedUnicornFieldValue(obj, sitecore_constants.TEMPLATE_FIELD_TYPE_FIELD_ID);
            if (!fieldType) {
                throw `Field type is a required field - field: ${obj.ID} - "${obj.Hint}"`;
            }
            
            var sortOrderField = getSharedUnicornFieldValue(obj, sitecore_constants.TEMPLATE_FIELD_SORTORDER_FIELD_ID);
            var sourceField = getSharedUnicornFieldValue(obj, sitecore_constants.TEMPLATE_FIELD_SOURCE_FIELD_ID);
            var sharedField = getSharedUnicornFieldValue(obj, sitecore_constants.TEMPLATE_FIELD_SHARED_FIELD_ID);
            var unversionedField = getSharedUnicornFieldValue(obj, sitecore_constants.TEMPLATE_FIELD_UNVERSIONED_FIELD_ID);
    
            item = new TemplateField(obj.ID, obj.Template, parent, obj.Path, fieldType, sortOrderField, sourceField, sharedField, unversionedField);
            
            obj.Languages.forEach(function(language) {
                // title field is unversioned so lives in language.Fields and not language.Versions
                var titleField = language.Fields 
                    ? language.Fields
                        .find(function(field) { return field.ID == sitecore_constants.TEMPLATE_FIELD_TITLE_FIELD_ID})
                    : undefined;
                
                if (!titleField || !titleField.Value) {
                    return;
                }
    
                item.addTitle(titleField.Value, language.Language);
            });
            
            if (!parent) { // usually means field was added to a native Sitecore template section
                sitecoreTree[item.ID] = item;
                sitecoreItems[item.ID] = item;
            } else if (!(parent instanceof TemplateSection)) {
                throw `TemplateField parent must be a TemplateSection - field: ${obj.ID} - "${obj.Path}"`;
            } else {
                parent.TemplateFields.push(item);
                sitecoreItems[item.ID] = item;
            }
        } else if (parent && obj.Template == parent.ID) { // standard values
            item = new StandardValues(obj.ID, obj.Template, parent, obj.Path);
    
            // set shared fields
            if (obj.SharedFields) {
                obj.SharedFields.forEach(function(field) {
                    item.setFieldValue(field.ID, field.Value);
                });
            }
    
            if (obj.Languages) {
                obj.Languages.forEach(function(language) {
                    // set unversioned fields
                    if (language.Fields) {
                        language.Fields.forEach(function(field) {
                            if (!field.Value) {
                                return;
                            }
    
                            item.setFieldValue(field.ID, field.Value, language.Language);
                        });
                    }
    
                    // set versioned fields
                    if (language.Versions) {
                        language.Versions.forEach(function(version) {
                            version.Fields.forEach(function(field) {
                                item.setFieldValue(field.ID, field.Value, language.Language, version.Version);
                            });
                        });
                    }
                });
            }
    
            parent.StandardValues = item;
            sitecoreItems[item.ID] = item;
        } else {
            // TODO: for production version, this cannot throw, as it is conceivable that a __Standard Values item may have been added to a native Sitecore template
            throw `Item template was not of a recognized type - item: ${obj.ID} - "${obj.Path}"`;
        }
    });

    return sitecoreTree;
};

/**
 * @summary reads and parses the Unicorn data found using the given glob into an array of @see Database objects
 * @param {string} unicornSourcesGlob the glob used to retrieve the Unicorn source files
 * @param {Array<string>} databaseNames the names of the databases to be included (all if omitted)
 * @returns {Array<Database>} array of parsed @see Database objects
 */
var readAndParseDatabases = function(unicornSourcesGlob, databaseNames) {
    var unicornObjects = [];
    // get and sort the paths alphabetically, then load and parse the yaml in each
    glob.sync(unicornSourcesGlob).forEach(function (file) {
        var fileName = path.resolve(file);
        var obj = yaml.safeLoad(fs.readFileSync(fileName), { filename: fileName });
        obj.SourceFilePath = fileName;
    
        unicornObjects.push(obj);
    });
    
    if (databaseNames) {
        unicornObjects = unicornObjects
            .filter((obj) => databaseNames.includes(obj.DB));
    }

    unicornObjects = unicornObjects   
        .filter(function (obj) { 
            return obj.Path.startsWith(sitecore_constants.TEMPLATES_ROOT_PATH) 
                && !obj.Path.startsWith(sitecore_constants.TEMPLATES_BRANCHES_ROOT_PATH); 
        })
        // sort by path to ensure that parent items are always processed before children
        .sort(function(obj1, obj2) {
            var path1 = obj1.Path.toLowerCase();
            var path2 = obj2.Path.toLowerCase();
    
            if (path1 > path2) {
                return 1;
            } 
            
            if (path1 < path2) {
                return -1;
            }
    
            return 0;
        });
    
    var itemsByDatabase = {};
    unicornObjects.forEach(function(obj) {
        if (itemsByDatabase[obj.DB]) {
            itemsByDatabase[obj.DB].push(obj);
        } else {
            itemsByDatabase[obj.DB] =  [ obj ];
        }
    });
    
    var databaseNames = Object.keys(itemsByDatabase);
    var databases = databaseNames.map(function(databaseName) {
        var items = itemsByDatabase[databaseName];
        var itemTree = _parseSitecoreItemTree(items);

        return new Database(databaseName, itemTree);
    });

    return databases;
};


/**
 * EXPORTS
 */

exports.readAndParseDatabases = readAndParseDatabases;





