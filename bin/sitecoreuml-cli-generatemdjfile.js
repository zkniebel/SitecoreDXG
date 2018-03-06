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
var mdjson = require("metadata-json");
var mdgen = require("../node_modules/mdgen/bin/mdgen");
var fs = require("fs");
var nodeCanvas = require("canvas");

var _dagre = require("dagre");
var _graphlib = require("graphlib");

commander
  .option("-p, --projectname <projectname>", "project name (optional)")
  .option("-d, --layoutdirection <layoutdirection>", "layout direction (optional); one of \"TB\", \"BT\", \"LR\", \"RL\"")
  .option("-o, --output <file>", "output file (required)")
  .parse(process.argv);

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
 * PROPERTIES
 */

/** 
 * @description Map that stores the created views for the items as values and the item IDs as the keys
 */
var _createdItemViewsCache = {};

/*
 * FUNCTIONS
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
function initializeAndSizeView(view, canvas, x1, y1, x2, y2) {
  x1 = x1 || 0;
  y1 = y1 || 0;
  x2 = x2 || 0;
  y2 = y2 || 0;

  view.subViews.forEach(function(subView) {
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
function createContainmentRelationshipView(childView, parentView, diagram, canvas) {
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
function createBaseTemplateRelationshipModel(templateModel, baseTemplateModel) {
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
function createBaseTemplateRelationshipView(model, templateView, baseTemplateView, diagram, canvas) {
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
function createTagModel(name, kind, value) {
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
function createFieldModel(jsonField, templateModel) {
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
    createTagModel("Title", "string", jsonField.Title),
    createTagModel("SectionName", "string", jsonField.SectionName),
    createTagModel("Source", "string", jsonField.Source),
    createTagModel("StandardValue", "string", jsonField.StandardValue),
    createTagModel("Shared", "string", jsonField.Shared),
    createTagModel("Unversioned", "string", jsonField.Unversioned)
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
function createFieldView(model, parentView, canvas) {
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
function createTemplateModel(jsonTemplate, parentModel) {
  var model = new type.UMLInterface();
  model._type = "UMLInterface";
  model._id = jsonTemplate.ReferenceID;
  model._parent = parentModel
  model.name = jsonTemplate.Name;

  parentModel.ownedElements.push(model);

  jsonTemplate.Fields.forEach(function (jsonField) {
    createFieldModel(jsonField, model);
  });

  return model;
};

/**  
 * Creates a new UMLInterface view for the given model and returns it
  * @param {UMLInterface} model the model to create the view for
  * @param {UMLDiagram} diagram the diagram to display the view
  * @param {Canvas} canvas the canvas for drawing and sizing the view
  * @returns {UMLInterfaceView}
 */
function createTemplateView(model, diagram, canvas) {
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
    createFieldView(fieldModel, attributeCompartmentView, canvas);
  });

  initializeAndSizeView(view, canvas);
  diagram.addOwnedView(view);
  
  _createdItemViewsCache[model._id] = view;
  return view;
};

/**
 *  Creates a new UMLPackage model for the given JSON folder and its descendents and returns the model
  * @param {JsonTemplateFolder} jsonFolder the folder item to create the model and view for
  * @param {Model} parentModel the parent model
  * @param {UMLClassDiagram} templatesDiagram diagram for the templates
  * @param {UMLPackageDiagram} templateFoldersDiagram diagram for the template folders
  * @param {Canvas} canvas the canvas for drawing and sizing the view
  * @returns {UMLPackage}
 */
function createFolderModel(jsonFolder, parentModel, templatesDiagram, templateFoldersDiagram, canvas) {
  var model = new type.UMLPackage();
  model._type = "UMLPackage";
  model._id = jsonFolder.ReferenceID;
  model._parent = parentModel;
  model.name = jsonFolder.Name;
  // TODO: Move the creation of the child models out into a separate function called from this function's caller
  model.ownedElements = jsonFolder.Children.map(function (jsonItem) {
    var view = createItemModelAndView(jsonItem, model, templatesDiagram, templateFoldersDiagram, canvas);
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
  * @returns {UMLPackageView}
 */
function createFolderView(model, diagram, canvas) {
  var view = new type.UMLPackageView();
  view._type = "UMLPackageView";
  view.model = model;

  view.subViews.forEach(function(subView) {
    subView.model = model;
  });

  initializeAndSizeView(view, canvas);
  diagram.addOwnedView(view);

  _createdItemViewsCache[model._id] = view;
  return view;
};

/**
 * Creates the model and view for the JSON template item and returns the view
  * @param {JsonTemplate} jsonTemplate the JSON template item
  * @param {Model} parentModel the parent model
  * @param {UMLDiagram} diagram the diagram to display the view
  * @param {Canvas} canvas the canvas for drawing and sizing the view
  * @returns {View}
 */
function createTemplateModelAndView(jsonTemplate, parentModel, diagram, canvas) {
  var model = createTemplateModel(jsonTemplate, parentModel);
  var view = createTemplateView(model, diagram, canvas);

  return view;
};

/**
 * Creates the model and view for the JSON folder item and returns the view
  * @param {JsonFolderTemplate} jsonFolder the JSON folder item
  * @param {Model} parentModel the parent model
  * @param {UMLClassesDiagram} templatesDiagram the diagram for the templates
  * @param {UMLPackageDiagram} templateFoldersDiagram the diagram for the template folders
  * @param {Canvas} canvas the canvas for drawing and sizing the view 
 */
function createFolderModelAndView(jsonFolder, parentModel, templatesDiagram, templateFoldersDiagram, canvas) {
  var model = createFolderModel(jsonFolder, parentModel, templatesDiagram, templateFoldersDiagram, canvas);
  var view = createFolderView(model, templateFoldersDiagram, canvas);
  return view;
};

/**
 * Creates a new view amd model for the given JSON item and returns the view
 * @param {JsonItem} jsonItem the item to create the model and view for
 * @param {Model} parentModel the parent model
 * @param {UMLClassDiagram} templatesDiagram the templates diagram to add templates to
 * @param {UMLPackagesDiagram} templateFoldersDiagram the template folders diagram to add template folders to
 * @param {Canvas} canvas the canvas for drawing and sizing the view
 * @returns {View}
 */
function createItemModelAndView(jsonItem, parentModel, templatesDiagram, templateFoldersDiagram, canvas) {
  return jsonItem.IsTemplate
    ? createTemplateModelAndView(jsonItem, parentModel, templatesDiagram, canvas)
    : createFolderModelAndView(jsonItem, parentModel, templatesDiagram, templateFoldersDiagram, canvas);
};

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
 * Gets a flat array of JSON items from the given JSON item
 * @param {JsonItem} jsonItem the item to get the array of JSON items from
 * @returns {Array<JsonItem>}
 */
function getJsonItems(jsonItem) {
  return jsonItem.IsTemplate
    ? [ jsonItem ]
    : [ jsonItem ]
        .concat(jsonItem.Children
          .map(getJsonItems))
        .reduce(function(result, entry) { return result.concat(entry); }, []);
};

/**
 * Gets a flat array of JSON templates from the given JSON item
 * @param {JsonItem} jsonItem the item to get the array of JSON templates from
 * @returns {Array<JsonTemplate>}
 */
function getJsonTemplates(jsonItem) {
  return jsonItem.IsTemplate
    ? [ jsonItem ]
    : jsonItem.Children
        .map(getJsonTemplates)
        .reduce(function(result, entry) { return result.concat(entry); }, []);
};

/*
 * BEGIN COMMAND EXECUTION
 */

var url = "http://local.sitecoreuml.com/sitecoreuml/template2/gettemplatearchitecture";
request.get(url, (error, response, body) => {
  if (error) {
    console.error(error);
    return;
  }

  var json = JSON.parse(body);

  if (!json.Success) {
    console.error("An error occurred!");
    console.error(json.ErrorMessage);
  }

  var project = new type.Project();
  project._type = "Project";
  project.name = commander.projectname || "Untitled";

  var rootModel = new type.UMLModel();
  rootModel._type = "UMLModel";
  rootModel._parent = project;
  rootModel.name = "Sitecore Templates Data Model";

  project.ownedElements = [rootModel];

  var templatesDiagram = new type.UMLClassDiagram();
  templatesDiagram._type = "UMLClassDiagram";
  templatesDiagram._parent = rootModel;
  templatesDiagram.name = "Templates Diagram";
  rootModel.ownedElements.push(templatesDiagram);

  var templateFoldersDiagram = new type.UMLPackageDiagram();
  templateFoldersDiagram._type = "UMLPackageDiagram";
  templateFoldersDiagram._parent = rootModel;
  templateFoldersDiagram.name = "Template Folders Diagram";
  rootModel.ownedElements.push(templateFoldersDiagram);

  var architecture = JSON.parse(json.Data);

  // create the canvas to use for drawing/sizing
  var canvas = createCanvas();

  // creates the folder, template and field models and views
  architecture.Items.forEach(function (jsonItem) {
    createItemModelAndView(jsonItem, rootModel, templatesDiagram, templateFoldersDiagram, canvas);
  });

  // get all the json items in a flat array and then create the relationships for the items
  // *** this needs to run in a separate loop to ensure all items have already been created
  architecture.Items
    .map(getJsonItems)
    .reduce(function(result, entry) { return result.concat(entry); }, [])
    .forEach(function (jsonItem) {
      var view = _createdItemViewsCache[jsonItem.ReferenceID];
      
      // create the base template relationship models and views
      if (jsonItem.IsTemplate) {
        jsonItem.BaseTemplates.forEach(function (jsonBaseTemplateId) {
          var baseTemplateView = _createdItemViewsCache[jsonBaseTemplateId];

          var model = createBaseTemplateRelationshipModel(view.model, baseTemplateView.model);

          createBaseTemplateRelationshipView(model, view, baseTemplateView, templatesDiagram, canvas);
        });
      // create the parent-child relationship views
      } else { 
        var parentModel = view.model._parent;
        var parentView = _createdItemViewsCache[parentModel._id];

        // may not have a parent if it is a root folder (e.g. Foundation, Feature or Project, in Helix)
        if (!parentView) { 
          return;
        }
        createContainmentRelationshipView(view, parentView, templateFoldersDiagram, canvas);
      }
    });

  // layout the diagrams
  var layoutDirection = commander.layoutdirection || "";
  templatesDiagram.layout(layoutDirection);
  templateFoldersDiagram.layout(layoutDirection);

  // save the project to the output location
  commander.output = commander.output || "output.mdj";

  // serialize the project to JSON
  var mdjcontent = mdjson.Repository.writeObject(project);

  fs.writeFile(commander.output, mdjcontent, "utf8");
  console.log("Done");
});

