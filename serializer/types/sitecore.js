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
const sitecore_constants = require("../constants/sitecore.js");
const { Entity } = require("./object.js");


/**
 * CONSTANTS
 */

const SHARED_LANGUAGE_KEY = "Shared";
const UNVERSIONED_VERSION_KEY = "Unversioned"; 


/**
 * ENUMS
 */

/**
 * @summary Type names of Sitecore object types
 */
const TypeNames = {
    Database: "Database",
    StandardValues: "StandardValues",
    TemplateField: "TemplateField",
    TemplateSection: "TemplateSection",
    TemplateFolder: "TemplateFolder",
    Template: "Template",
    Item: "Item",
};


/**
 * TYPES
 */

/**
 * @summary Represents a Sitecore item
 * @param {string} id the ID of the item
 * @param {string} templateID the Template ID of the item
 * @param {Item} parent the parent of the item
 * @param {string} path the path of the item
 */
function Item(id, templateID, parent, path) {
    Entity.call(this, TypeNames.Item);

    /**
     * @property holds the ID of the item
     */
    this.ID = id;
    /**
     * @property holds the Template ID of the item
     */
    this.TemplateID = templateID;
    /**
     * @property holds a reference to the parent of the item
     */
    this.Parent = parent;
    /**
     * @property holds the path of the item
     */
    this.Path = path;

    /**
     * @property holds the name of the item
     */
    this.Name = path.substring(path.lastIndexOf("/") + 1);

    /**
     * @property holds the language versions of the item
     * @description A multi-dimensional array that holds the language versions of the item. The array
     * is structured as LanguageVersions[<language>][<version>][<fieldID>] = value. Note that for 
     * shared and unversioned fields, the @see SHARED_LANGUAGE_KEY and @see UNVERSIONED_VERSION_KEY 
     * constants are used.
     */
    this.LanguageVersions = [];
};

Item.prototype = Object.create(Entity.prototype);
Item.prototype.constructor = Item;

/**
 * @summary Gets the languages that the item has field values in
 * @returns {string} the language keys
 */
Item.prototype.getLanguages = function () {
    return Object.keys(this.LanguageVersions);
};

/**
 * @summary Gets the value of the specified field in the given language and version
 * @param {string} fieldID the ID of the field
 * @param {string} language the language code (Default: @see SHARED_LANGUAGE_KEY)
 * @param {string} version the version number (Default: @see UNVERSIONED_VERSION_KEY)
 * @returns {string} the value of the field
 */
Item.prototype.getFieldValue = function (fieldID, language = SHARED_LANGUAGE_KEY, version = UNVERSIONED_VERSION_KEY) {
    var language = this.LanguageVersions[language];
    if (!language) {
        return undefined;
    }

    var languageVersion = language[version];
    if (!version) {
        return undefined;
    }

    return languageVersion[fieldID];
};

/**
 * @summary Sets the value of the specified field in the given language and version
 * @param {string} fieldID the ID of the field
 * @param {string} value the value to set
 * @param {string} language the language code (Default: @see SHARED_LANGUAGE_KEY)
 * @param {string} version the version number (Default: @see UNVERSIONED_VERSION_KEY)
 */
Item.prototype.setFieldValue = function (fieldID, value, language = SHARED_LANGUAGE_KEY, version = UNVERSIONED_VERSION_KEY) {
    var lang = this.LanguageVersions[language];
    if (!lang) {
        lang = {};
        this.LanguageVersions[language] = lang;
    }

    var langVersion = lang[version];
    if (!langVersion) {
        langVersion = {};
        lang[version] = langVersion;
    }

    langVersion[fieldID] = value;
};


/**
 * @summary Represents a Sitecore template item
 * @param {string} id the ID of the template
 * @param {string} templateID the template ID of the template
 * @param {Item} parent the parent of the template
 * @param {string} path the path of the template
 * @param {Array<string>} baseTemplates the base templates of the template
 * @param {Array<TemplateSection>} templateSections the template sections of the template
 * @param {StandardValues} standardValues the standard values of the template
 */
function Template(id, templateID, parent, path, baseTemplates = [], templateSections = [], standardValues = undefined) {
    Item.call(this, id, templateID, parent, path, TypeNames.Template);

    /**
     * @property the IDs of the base templates of the template
     */
    this.BaseTemplates = baseTemplates;
    /**
     * @property the @see TemplateSection items that belong to the template
     */
    this.TemplateSections = templateSections;

    /**
     * @property the @see StandardValues item that belongs to the template
     */
    this.StandardValues = standardValues;
};

Template.prototype = Object.create(Item.prototype);
Template.prototype.constructor = Template;

/**
 * @summary Gets the @see TemplateField items that are defined on the template
 * @description It is important to note that this function retrieves the fields defined on the template
 * itself, but does not return fields inherited from base templates
 */
Template.prototype.getFields = function () {
    return this.TemplateSections
        .map(function (templateSection) {
            return templateSection.TemplateFields;
        });
};


/**
 * @summary Represents a Sitecore template folder item
 * @param {string} id the ID of the template folder
 * @param {string} templateID the template ID of the template folder
 * @param {Item} parent the parent of the template folder
 * @param {string} path the path of the template folder
 * @param {Array<Item>} children the child items of the template folder
 * @description It's important to note that while in Sitecore there is a difference between a template
 * folder and a (common) folder, both are treated as TemplateFolder items in this program. This means
 * that if you use both Folder and Template Folder items as folders for your templates your tree 
 * structure can still be processed and all folders will be represented as TemplateFolder items. 
 */
function TemplateFolder(id, templateID, parent, path, children = []) {
    Item.call(this, id, templateID, parent, path, TypeNames.TemplateFolder);

    /**
     * @property the child items of the template folder
     */
    this.Children = children;
};

TemplateFolder.prototype = Object.create(Item.prototype);
TemplateFolder.prototype.constructor = TemplateFolder;


/**
 * @summary Represents a Sitecore template section item
 * @param {string} id the ID of the template section
 * @param {string} templateID the template ID of the template section
 * @param {Item} parent the parent of the template section
 * @param {string} path the path of the template section
 * @param {Array<TemplateField>} templateFields the template fields of the template section
 */
function TemplateSection(id, templateID, parent, path, templateFields = []) {
    Item.call(this, id, templateID, parent, path, TypeNames.TemplateSection);

    /**
     * @property the @see TemplateField items that belong to the template section
     */
    this.TemplateFields = templateFields;
};

TemplateSection.prototype = Object.create(Item.prototype);
TemplateSection.prototype.constructor = TemplateSection;


/**
 * @summary Represents a Sitecore template field item
 * @param {string} id the ID of the template field
 * @param {string} templateID the template ID of the template field
 * @param {Item} parent the parent of the template field
 * @param {string} path the path of the template field
 * @param {string} fieldType the field type of the templatefield
 * @param {number} sortOrder the sort order of template field
 * @param {string} source the source of the template field
 * @param {boolean} shared if [true] template field is shared; [else] field is not shared
 * @param {boolean} unversioned if [true] template field is shared; [else] field is not shared
 */
function TemplateField(id, templateID, parent, path, fieldType, sortOrder = 100, source = "", shared = false, unversioned = false) {
    Item.call(this, id, templateID, parent, path, TypeNames.TemplateField);

    /**
     * @property holds the field type of the template field
     */
    this.FieldType = fieldType;
    /**
     * @property holds the sort order of the template field
     */
    this.SortOrder = sortOrder;
    /**
     * @property holds the source of the template field
     */
    this.Source = source;
    /**
     * @property holds the value that determines if the template field is shared
     */
    this.Shared = shared;
    /**
     * @property holds the value that determines if the template field is unversioned
     */
    this.Unversioned = unversioned;
};

TemplateField.prototype = Object.create(Item.prototype);
TemplateField.prototype.constructor = TemplateField;

/**
 * @summary Adds the given title value in the given language
 * @param {string} value the title value
 * @param {string} language the language of the title 
 */
TemplateField.prototype.addTitle = function (value, language) {
    this.setFieldValue(sitecore_constants.TEMPLATE_FIELD_TITLE_FIELD_ID, value, language);
};

/**
 * @summary Gets the title of the template field in the given language
 * @param {string} language the language of the title to retrieve
 */
TemplateField.prototype.getTitle = function (language) {
    return this.getFieldValue(sitecore_constants.TEMPLATE_FIELD_TITLE_FIELD_ID, language);
};


/**
 * @summary Represents a Sitecore __Standard Values item
 * @param {string} id the ID of the standard values item
 * @param {string} templateID the template ID of the standard values item
 * @param {Item} parent the parent of the standard values item
 * @param {string} path the path of the standard values item
 */
function StandardValues(id, templateID, parent, path) {
    Item.call(this, id, templateID, parent, path, TypeNames.Database);
};

StandardValues.prototype = Object.create(Item.prototype);
StandardValues.prototype.constructor = StandardValues;


/**
 * @summary Represents a Sitecore databases
 * @param {string} name the name of the database
 * @param {Array<Item>} itemTree the tree of items that live in the database
 */
function Database(name, itemTree = {}) {
    Entity.call(this, TypeNames.Database);

    this.Name = name;
    this.ItemTree = itemTree;
};

Database.prototype = Object.create(Entity.prototype);
Database.prototype.constructor = Database;


/**
 * EXPORTS
 */

exports.Database = Database;
exports.StandardValues = StandardValues;
exports.TemplateField = TemplateField;
exports.TemplateSection = TemplateSection;
exports.TemplateFolder = TemplateFolder;
exports.Template = Template;
exports.Item = Item;

exports.TypeNames = TypeNames;
