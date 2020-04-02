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

// third-party
const circular_json = require("flatted/cjs");

// local
const sitecore_constants = require("../constants/sitecore.js");
const Sitecore_Types = require("../types/sitecore.js");
const Documentation_Types = require("../types/documentation.js");

/**
 * FACTORY METHODS
 */

 /**
  * @summary Serializes the given object into circular JSON
  * @param {object} data the data to serialize 
  * @description See https://github.com/WebReflection/flatted for more details on circular JSON
  * @returns {string} the serialized data
  */
var serialize = function (data) {
    return circular_json.stringify(data);
};

/**
 * @summary Deserializes the given data from circular JSON to parsed Sitecore prototypes
 * @param {string} source the string data to deserialize 
 * @description See https://github.com/WebReflection/flatted for more details on circular JSON
 * @returns {object} the deserialized object
 */
var deserialize = function (source) {
    return circular_json.parse(source, function (key, value) {
        if (!value) {
            return value;
        }

        switch (value.TemplateID) {
            case sitecore_constants.FOLDER_TEMPLATE_ID:
                value.__proto__ = Sitecore_Types.TemplateFolder.prototype;
                break;
            case sitecore_constants.TEMPLATE_FOLDER_TEMPLATE_ID:
                value.__proto__ = Sitecore_Types.TemplateFolder.prototype;
                break;
            case sitecore_constants.TEMPLATE_TEMPLATE_ID:
                value.__proto__ = Sitecore_Types.Template.prototype;
                break;
            case sitecore_constants.TEMPLATE_SECTION_TEMPLATE_ID:
                value.__proto__ = Sitecore_Types.TemplateSection.prototype;
                break;
            case sitecore_constants.TEMPLATE_FIELD_TEMPLATE_ID:
                value.__proto__ = Sitecore_Types.TemplateField.prototype;
                break;
            default:
                // object may be standardvalues, database or somethign else
                switch (value.Type) {
                    case Sitecore_Types.TypeNames.Database:
                        value.__proto__ = Sitecore_Types.Database.prototype;
                        break;
                    case Sitecore_Types.TypeNames.StandardValues:
                        value.__proto__ = Sitecore_Types.StandardValues.prototype
                        break;
                    case Documentation_Types.TypeNames.Metaball:
                        value.__proto__ = Documentation_Types.Metaball.prototype;
                        break;
                    case Documentation_Types.TypeNames.HelixLayerMap:
                        value.__proto__ = Documentation_Types.HelixLayerMap.prototype;
                        break;
                    case Documentation_Types.TypeNames.HelixDatabaseMap:
                        value.__proto__ = Documentation_Types.HelixDatabaseMap.prototype;
                        break;
                    case Documentation_Types.TypeNames.GenerationSource:
                        value.__proto__ = Documentation_Types.GenerationSource.prototype;
                        break;
                    case Documentation_Types.TypeNames.SolutionStatistics:
                        value.__proto__ = Documentation_Types.SolutionStatistics.prototype;
                        break;
                    case Documentation_Types.TypeNames.HelixStatistics:
                        value.__proto__ = Documentation_Types.HelixStatistics.prototype;
                        break;
                    case Documentation_Types.TypeNames.HelixLayerStatistics:
                        value.__proto__ = Documentation_Types.HelixLayerStatistics.prototype;
                        break;
                    case Documentation_Types.TypeNames.HelixModuleStatistics:
                        value.__proto__ = Documentation_Types.HelixModuleStatistics.prototype;
                        break;
                    default:
                        // unknown type, let it fall through
                        break;
                }
                
        }
        return value;
    });
};


/**
 * EXPORTS
 */

exports.serialize = serialize;
exports.deserialize = deserialize;