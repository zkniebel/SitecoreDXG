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
const mdjson = require("metadata-json");
const nodeCanvas = require("canvas-prebuilt");
const extend = require("extend");

const _dagre = require("dagre");
const _graphlib = require("graphlib");

// local
const fileUtils = require("./utils/file-utils.js");

/*
 * GLOBALS
 */

/**
 * @description Global variable to hold the dagre library reference. The variable must be defined globally for MetaData-Json's diagram reformatting functionality to work.
 */
global.dagre = _dagre;
/**
 * @description Global variable to hold the graphlib library reference. The variable must be defined globally for MetaData-Json's diagram reformatting functionality to work.
 */
global.graphlib = _graphlib;

/*
 * TYPES
 */

/** 
 * Holds the options to be used for laying out each of the diagrams
 * @description Valid settings values are: "LR" (left to right), "RL" (right to left), "TB" (top to bottom), "BT" (bottom to top), and "" (auto)
 */
function LayoutOptions() {
  /**
   * @property layout of the templates diagram (Default: "LR")
   */
  this.TemplatesDiagram = "LR";
  /**
   * @property layout of the template folders diagram (Default: "LR")
   */
  this.TemplateFoldersDiagram = "LR";
  /**
   * @property layout of the module diagrams (Default: "LR")
   */
  this.ModuleDiagram = "LR";
  /**
   * @property layout of the layer diagrams (Default: "LR")
   */
  this.LayerDiagram = "LR";
};

/*
 * AUXILIARY FUNCTIONS
 */

/**
 * Initializes the given view and calculates its size
 * @param {*} view the view to initialize and size
 * @param {*} canvas the canvas on which to draw and size the view
 * @param {*} x1 the x1 coordinate (Default: 0)
 * @param {*} y1 the y1 coordinate (Default: 0)
 * @param {*} x2 the x2 coordinate (Default: 0)
 * @param {*} y2 the y2 coordinate (Default: 0)
 */
function _initializeAndSizeView(view, canvas, x1, y1, x2, y2) {
  x1 = x1 || 0;
  y1 = y1 || 0;
  x2 = x2 || 0;
  y2 = y2 || 0;

  view.subViews.forEach(function (subView) {
    subView.model = view.model;
  });

  view.setup(canvas);
  view.initialize(canvas, x1, y1, x2, y2);
  view.update(canvas);
  view.getSizeOfAllCompartments(canvas);
  view.sizeObject(canvas);
  view.height = view.minHeight;
  view.width = view.minWidth;
};

/**
 * Creates and returns the view for the containment that represents the parent-child relationship between the given view and its parent
 * @param {View} childView the child view
 * @param {UMLPackageView} parentView the parent view that contains the child view
 * @param {UMLDiagram} diagram the diagram on which the view should be added
 * @param {Canvas} canvas the canvas for drawing and sizing the view
 * @returns {UMLContainmentView}
 */
function _createContainmentRelationshipView(childView, parentView, diagram, canvas) {
  var view = new type.UMLContainmentView();
  view._type = "UMLContainmentView";
  view.tail = childView;
  view.head = parentView;

  view.initialize(canvas);
  diagram.addOwnedView(view);
  return view;
};

/**
 * Creates and returns the model for the generalization that represents the template being based on the base template 
 * @param {UMLInterface} templateModel the template model
 * @param {UMLInterface} baseTemplateModel te model of the template that the given template model is based on
 * @returns {UMLGeneralization} 
 */
function _createBaseTemplateRelationshipModel(templateModel, baseTemplateModel) {
  var model = new type.UMLGeneralization();
  model._type = "UMLGeneralization";
  model._parent = templateModel;
  model.source = templateModel;
  model.target = baseTemplateModel;

  templateModel.ownedElements.push(model);
  return model;
};

/**
 * Creates and returns the view for the generalization that represents the template being based on the base template
 * @param {UMLGeneralization} model the model of the generalization
 * @param {UMLInterfaceView} templateView the view of the template that is based on the base template
 * @param {UMLInterfaceView} baseTemplateView the view of the base template
 * @param {UMLDiagram} diagram the diagram to display the view on
 * @param {Canvas} canvas the canvas for drawing and sizing the view
 * @returns {UMLGeneralizationView}
 */
function _createBaseTemplateRelationshipView(model, templateView, baseTemplateView, diagram, canvas) {
  var view = new type.UMLGeneralizationView();
  view._type = "UMLGeneralizationView";
  view.model = model;
  view.tail = templateView;
  view.head = baseTemplateView;

  diagram.addOwnedView(view);
  view.initialize(canvas);
  return view;
};

/**
 * Creates and returns a new tag with the given name, kind and value
 * @param {String} name the name of the tag
 * @param {String} kind the type of the tag
 * @param {*} value the value of the tag
 * @returns {Tag}
 */
function _createTagModel(name, kind, value) {
  var model = new type.Tag();
  model._type = "Tag";
  model.name = name;
  model.kind = kind;
  model.value = value;

  return model;
}

/**
 * Creates and returns the attribute model for the given JSON field 
 * @param {JsonTemplateField} jsonField the JSON field to create the attribtue from
 * @param {UMLInterface} templateModel the template to add the new attribute model to
 * @returns {UMLAttribute}
 */
function _createFieldModel(jsonField, templateModel) {
  var model = new type.UMLAttribute();
  model._type = "UMLAttribute";
  model._parent = templateModel;
  model.name = jsonField.Name;
  model.type = jsonField.FieldType;
  model.documentation =
    "**Title:** `" + JSON.stringify(jsonField.Title) + "`  \n" +
    "**SectionName:** `" + JSON.stringify(jsonField.SectionName) + "`  \n" +
    "**Source:** `" + JSON.stringify(jsonField.Source) + "`  \n" +
    "**StandardValue:** `" + JSON.stringify(jsonField.StandardValue) + "`  \n" +
    "**Shared:** `" + JSON.stringify(jsonField.Shared) + "`  \n" +
    "**Unversioned:** `" + JSON.stringify(jsonField.Unversioned) + "`  \n";

  model.ownedElements = [
    _createTagModel("Title", "string", jsonField.Title),
    _createTagModel("SectionName", "string", jsonField.SectionName),
    _createTagModel("Source", "string", jsonField.Source),
    _createTagModel("StandardValue", "string", jsonField.StandardValue),
    _createTagModel("Shared", "string", jsonField.Shared),
    _createTagModel("Unversioned", "string", jsonField.Unversioned)
  ];

  templateModel.attributes.push(model);
  return model;
};

/**
 * Creates and returns the view for the field with the given model and adds it to the attributes compartment view
 * @param {UMLAttribute} model the model for the field 
 * @param {UMLAttributeCompartmentView} parentView the parent view of the field
 * @param {Canvas} canvas the canvas for drawing and sizing the view
 * @returns {UMLAttributeView}
 */
function _createFieldView(model, parentView, canvas) {
  var view = new type.UMLAttributeView();
  view._type = "UMLAttributeView";
  view._parent = parentView._id;
  view.model = model;

  parentView.addSubView(view);
  view.initialize(canvas);
  return view;
};

/**  
 * Creates a new UMLInterface model for the given JSON template and returns it
  * @param {JsonTemplate} jsonTemplate the template item to create the model and view for
  * @param {Model} parentModel the parent model
  * @returns {UMLInterface}
 */
function _createTemplateModel(jsonTemplate, parentModel) {
  var model = new type.UMLInterface();
  model._type = "UMLInterface";
  model._id = jsonTemplate.ReferenceID;
  model._parent = parentModel
  model.name = jsonTemplate.Name;

  parentModel.ownedElements.push(model);

  jsonTemplate.Fields.forEach(function (jsonField) {
    _createFieldModel(jsonField, model);
  });

  return model;
};

/**  
 * Creates a new UMLInterface view for the given model and returns it
  * @param {UMLInterface} model the model to create the view for
  * @param {UMLDiagram} diagram the diagram to display the view
  * @param {Canvas} canvas the canvas for drawing and sizing the view
  * @param {object} createdItemViewsCache map of item IDs to their created views
  * @returns {UMLInterfaceView}
 */
function _createTemplateView(model, diagram, canvas, createdItemViewsCache) {
  var view = new type.UMLInterfaceView();
  view._type = "UMLInterfaceView";
  view.model = model
  view.suppressAttributes = false;

  var attributeCompartmentViews = view.subViews.filter(function (subview) {
    return subview instanceof type.UMLAttributeCompartmentView;
  });
  if (!attributeCompartmentViews.length) {
    console.error("UMLAttributeCompartmentView was not found on view for template " + model._id);
    return;
  }

  var attributeCompartmentView = attributeCompartmentViews[0];
  model.attributes.forEach(function (fieldModel) {
    _createFieldView(fieldModel, attributeCompartmentView, canvas);
  });

  _initializeAndSizeView(view, canvas);
  diagram.addOwnedView(view);

  createdItemViewsCache[model._id] = view;
  return view;
};

/**
 *  Creates a new UMLPackage model for the given JSON folder and its descendents and returns the model
  * @param {JsonTemplateFolder} jsonFolder the folder item to create the model and view for
  * @param {Model} parentModel the parent model
  * @param {UMLClassDiagram} templatesDiagram diagram for the templates
  * @param {UMLPackageDiagram} templateFoldersDiagram diagram for the template folders
  * @param {Canvas} canvas the canvas for drawing and sizing the view
  * @param {object} createdItemViewsCache map of item IDs to their created views
  * @returns {UMLPackage}
 */
function _createFolderModel(jsonFolder, parentModel, templatesDiagram, templateFoldersDiagram, canvas, createdItemViewsCache) {
  var model = new type.UMLPackage();
  model._type = "UMLPackage";
  model._id = jsonFolder.ReferenceID;
  model._parent = parentModel;
  model.name = jsonFolder.Name;
  // TODO: Move the creation of the child models out into a separate function called from this function's caller
  model.ownedElements = jsonFolder.Children.map(function (jsonItem) {
    var view = _createItemModelAndView(jsonItem, model, templatesDiagram, templateFoldersDiagram, canvas, createdItemViewsCache);
    return view.model;
  });

  parentModel.ownedElements.push(model);
  return model;
};

/**
 *  Creates a new UMLPackage model and view for the given JSON folder and returns the View
  * @param {UMLPackage} model the model for the package
  * @param {UMLDiagram} diagram the diagram to display the view
  * @param {Canvas} canvas the canvas for drawing and sizing the view
  * @param {object} createdItemViewsCache map of item IDs to their created views
  * @returns {UMLPackageView}
 */
function _createFolderView(model, diagram, canvas, createdItemViewsCache) {
  var view = new type.UMLPackageView();
  view._type = "UMLPackageView";
  view.model = model;

  view.subViews.forEach(function (subView) {
    subView.model = model;
  });

  _initializeAndSizeView(view, canvas);
  diagram.addOwnedView(view);

  createdItemViewsCache[model._id] = view;
  return view;
};

/**
 * Creates the model and view for the JSON template item and returns the view
  * @param {JsonTemplate} jsonTemplate the JSON template item
  * @param {Model} parentModel the parent model
  * @param {UMLDiagram} diagram the diagram to display the view
  * @param {Canvas} canvas the canvas for drawing and sizing the view
  * @param {object} createdItemViewsCache map of item IDs to their created views
  * @returns {View}
 */
function _createTemplateModelAndView(jsonTemplate, parentModel, diagram, canvas, createdItemViewsCache) {
  var model = _createTemplateModel(jsonTemplate, parentModel);
  var view = _createTemplateView(model, diagram, canvas, createdItemViewsCache);

  return view;
};

/**
 * Creates the model and view for the JSON folder item and returns the view
  * @param {JsonFolderTemplate} jsonFolder the JSON folder item
  * @param {Model} parentModel the parent model
  * @param {UMLClassesDiagram} templatesDiagram the diagram for the templates
  * @param {UMLPackageDiagram} templateFoldersDiagram the diagram for the template folders
  * @param {Canvas} canvas the canvas for drawing and sizing the view 
  * @param {object} createdItemViewsCache map of item IDs to their created views
  * @returns {View}
 */
function _createFolderModelAndView(jsonFolder, parentModel, templatesDiagram, templateFoldersDiagram, canvas, createdItemViewsCache) {
  var model = _createFolderModel(jsonFolder, parentModel, templatesDiagram, templateFoldersDiagram, canvas, createdItemViewsCache);
  var view = _createFolderView(model, templateFoldersDiagram, canvas, createdItemViewsCache);
  return view;
};

/**
 * Creates a new view amd model for the given JSON item and returns the view
 * @param {JsonItem} jsonItem the item to create the model and view for
 * @param {Model} parentModel the parent model
 * @param {UMLClassDiagram} templatesDiagram the templates diagram to add templates to
 * @param {UMLPackagesDiagram} templateFoldersDiagram the template folders diagram to add template folders to
 * @param {Canvas} canvas the canvas for drawing and sizing the view
 * @param {object} createdItemViewsCache map of item IDs to their created views
 * @returns {View}
 */
function _createItemModelAndView(jsonItem, parentModel, templatesDiagram, templateFoldersDiagram, canvas, createdItemViewsCache) {
  return jsonItem.IsTemplate
    ? _createTemplateModelAndView(jsonItem, parentModel, templatesDiagram, canvas, createdItemViewsCache)
    : _createFolderModelAndView(jsonItem, parentModel, templatesDiagram, templateFoldersDiagram, canvas, createdItemViewsCache);
};

/**
 * Gets a flat array of JSON items from the given JSON item
 * @param {JsonItem} jsonItem the item to get the array of JSON items from
 * @returns {Array<JsonItem>}
 */
function _getJsonItems(jsonItem) {
  return jsonItem.IsTemplate
    ? [jsonItem]
    : [jsonItem]
      .concat(jsonItem.Children
        .map(_getJsonItems))
      .reduce(function (result, entry) { return result.concat(entry); }, []);
};

/**
 * Gets a flat array of JSON templates from the given JSON item
 * @param {JsonItem} jsonItem the item to get the array of JSON templates from
 * @returns {Array<JsonTemplate>}
 */
function _getJsonTemplates(jsonItem) {
  return jsonItem.IsTemplate
    ? [jsonItem]
    : jsonItem.Children
      .map(_getJsonTemplates)
      .reduce(function (result, entry) { return result.concat(entry); }, []);
};

/*
 * PUBLIC FUNCTIONS
 */

/**
 * Creates a new Canvas object with the given width, height and context type and then returns it
 * @param {Numeric} width the width of the canvas (Default: 2000)
 * @param {Numeric} height the height of the canvas (Default: 2000)
 * @param {String} contextType the context type of the canvas (Default: "2d")
 * @returns {Canvas}
 */
function createCanvas(width, height, contextType) {
  width = width || 2000;
  height = height || 2000;
  contextType = contextType || "2d";

  var nCanvas = new nodeCanvas(width, height);
  var canvasContext = nCanvas.getContext(contextType);

  return new mdjson.Graphics.Canvas(canvasContext);
}

/**
 * Reverse engineers the mdj filefor the given architecture and returns the local path to the resulting file
 * @param {object} architecture the architecture to generate the mdj file for
 * @param {String} outputFilePath the path to the output file
 * @param {LayoutOptions} layoutOptions (Optional) the formatting options for the diagrams (Default: LayoutOptions defaults)
 * @param {Canvas} canvas (Optional) the canvas on which to draw/size the views
 * @returns {String}
 */
var reverseEngineerMetaDataJsonFile = (architecture, outputFilePath, layoutOptions, canvas) => {
  /* 0) ASSERT AND FORMAT ARGUMENTS */

  // architecture is required and must have an initialized Items property
  if (!architecture || !architecture.Items) {
    throw "The JSON architecture is required and the JSON Items property must be intialized.";
  }

  // outputFilePath is required
  if (!outputFilePath) {
    throw "The output file path is required";
  }

  // merge the user specified layout options with the defaults
  layoutOptions = extend(new LayoutOptions(), layoutOptions);

  // make the canvas fallback to a new canvas with default values
  canvas = canvas || createCanvas();

  /* 1) CREATE BASIC ENTITIES: PROJECT, ROOT MODEL, TEMPLATES DIAGRAM, AND CLASS DIAGRAMS */

  // create the projet
  var project = new type.Project();
  project._type = "Project";
  project.name = "Untitled"; // TODO: move to option

  // create the root model
  var rootModel = new type.UMLModel();
  rootModel._type = "UMLModel";
  rootModel._parent = project;
  rootModel.name = "Sitecore Templates Data Model"; // TODO: move to option

  project.ownedElements = [rootModel];

  // create the templates diagram
  var templatesDiagram = new type.UMLClassDiagram();
  templatesDiagram._type = "UMLClassDiagram";
  templatesDiagram._parent = rootModel;
  templatesDiagram.name = "Templates Diagram"; // TODO: move to option
  rootModel.ownedElements.push(templatesDiagram);

  // create the template folder's diagram
  var templateFoldersDiagram = new type.UMLPackageDiagram();
  templateFoldersDiagram._type = "UMLPackageDiagram";
  templateFoldersDiagram._parent = rootModel;
  templateFoldersDiagram.name = "Template Folders Diagram"; // TODO: move to option
  rootModel.ownedElements.push(templateFoldersDiagram);

  /* 2) CREATE ALL OF THE MODELS AND VIEWS FOR THE ITEMS */

  // create the map object to use for storing the mappings from the created items' IDs to their views
  var createdItemViewsCache = {};

  // creates the folder, template and field models and views
  architecture.Items.forEach(function (jsonItem) {
    _createItemModelAndView(jsonItem, rootModel, templatesDiagram, templateFoldersDiagram, canvas, createdItemViewsCache);
  });

  /* 3) CREATE ALL OF THE ITEM RELATIONSHIP MODELS AND VIEWS */

  // get all the json items in a flat array and then create the relationships for the items
  // *** this needs to run in a separate loop to ensure all items have already been created
  architecture.Items
    .map(_getJsonItems)
    .reduce(function (result, entry) { return result.concat(entry); }, [])
    .forEach(function (jsonItem) {
      var view = createdItemViewsCache[jsonItem.ReferenceID];

      // create the base template relationship models and views
      if (jsonItem.IsTemplate) {
        jsonItem.BaseTemplates.forEach(function (jsonBaseTemplateId) {
          var baseTemplateView = createdItemViewsCache[jsonBaseTemplateId];

          var model = _createBaseTemplateRelationshipModel(view.model, baseTemplateView.model);

          _createBaseTemplateRelationshipView(model, view, baseTemplateView, templatesDiagram, canvas);
        });
        // create the parent-child relationship views
      } else {
        var parentModel = view.model._parent;
        var parentView = createdItemViewsCache[parentModel._id];

        // may not have a parent if it is a root folder (e.g. Foundation, Feature or Project, in Helix)
        if (!parentView) {
          return;
        }
        _createContainmentRelationshipView(view, parentView, templateFoldersDiagram, canvas);
      }
    });

  /* 4) CLEANUP/REFORMAT THE DIAGRAMS */

  // layout the diagrams
  templatesDiagram.layout(layoutOptions.TemplatesDiagram);
  templateFoldersDiagram.layout(layoutOptions.TemplateFoldersDiagram);

  // serialize the project to JSON
  var mdjcontent = mdjson.Repository.writeObject(project);

  fs.writeFileSync(outputFilePath, mdjcontent, "utf8");
  console.log(`MDJ created at path "${outputFilePath}"`);

  return outputFilePath;
};

/**
 * Generates the HTML documentation for the given metadata-json file
 * @param {String} mdjFilePath the file to generate the docs from
 * @param {String} outputFolderPath the output folder location where the docs are to be stored
 */
var generateHtmlDocumentation = (mdjFilePath, outputFolderPath) => {
  try {
    mdjson.loadFromFile(mdjFilePath);
    mdjson.exportToHTML(outputFolderPath, true);
    console.log(`HTML Documentation Generated at path "${outputFolderPath}"`);
  } catch (error) {
    console.error(error);
    return;
  }
};

/**
 * Generates the HTML documentation fo rthe given metadata-json file, zips it and then executes a callback
 * @param {String} mdjFilePath path to the metadata-json file to generate the docs from
 * @param {String} docFolderPath the output folder location where the uncompressed docs are to be stored
 * @param {String} archiveFilePath the file location where the compressed docs are to be stored
 * @param {String} successCallback the callback to execute after the docs have successfully finished being archived
 * @param {String} errorCallback the callback to execute if the archiving process fails
 */
var generateHtmlDocumentationArchive = (mdjFilePath, docFolderPath, archiveFilePath, successCallback, errorCallback) => {
  // generate the docs
  generateHtmlDocumentation(mdjFilePath, docFolderPath);

  // archive the docs
  fileUtils.createArchive(
    docFolderPath,
    archiveFilePath,
    successCallback,
    errorCallback
  );
};

/**
 * EXPORTS
 */

exports.LayoutOptions = LayoutOptions;
exports.createCanvas = createCanvas;
exports.reverseEngineerMetaDataJsonFile = reverseEngineerMetaDataJsonFile;
exports.generateHtmlDocumentation = generateHtmlDocumentation;
exports.generateHtmlDocumentationArchive = generateHtmlDocumentationArchive;