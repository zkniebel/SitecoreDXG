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
const nodeCanvas = require("canvas").createCanvas;
const extend = require("extend");

const _dagre = require("dagre");
const _graphlib = require("graphlib");

// local
const fileUtils = require("./utils/file-utils.js");
const logger = require("./logging.js").logger;

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
 * Creates and returns the model for the dependency from one model to another 
 * @param {UMLInterface} sourceModel the source model 
 * @param {UMLInterface} targetModel the model that the sourceModel depends on
 * @returns {UMLDependency} 
 */
function _createDependencyRelationshipModel(sourceModel, targetModel) {
  var model = new type.UMLDependency();
  model._type = "UMLDependency";
  model._parent = sourceModel;
  model.source = sourceModel;
  model.target = targetModel;

  sourceModel.ownedElements.push(model);
  return model;
};

/**
 * Creates and returns the view for the dependency from one model to another
 * @param {UMLDependency} model the model of the dependency
 * @param {View} sourceView the view of the source model
 * @param {View} targetView the view of the model that the sourceView's model depends on
 * @param {UMLDiagram} diagram the diagram to display the view on
 * @param {Canvas} canvas the canvas for drawing and sizing the view
 * @returns {UMLDependencyView}
 */
function _createDependencyRelationshipView(model, sourceView, targetView, diagram, canvas) {
  var view = new type.UMLDependencyView();
  view._type = "UMLDependencyView";
  view.model = model;
  view.tail = sourceView;
  view.head = targetView;

  diagram.addOwnedView(view);
  view.initialize(canvas);
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
  view.model = model;
  view.suppressAttributes = false;

  var attributeCompartmentViews = view.subViews.filter(function (subview) {
    return subview instanceof type.UMLAttributeCompartmentView;
  });
  if (!attributeCompartmentViews.length) {
    logger.error("UMLAttributeCompartmentView was not found on view for template " + model._id);
    return;
  }

  var attributeCompartmentView = attributeCompartmentViews[0];
  if (model.attributes) {
    model.attributes.forEach(function (fieldModel) {
      _createFieldView(fieldModel, attributeCompartmentView, canvas);
    });
  } else {    
    model.attributes = [];
  }

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

/**
 * Generates the helix diagrams for the architecture based on the given documentation configuration
 * @param {object} documentationConfiguration 
 * @param {Canvas} canvas 
 * @param {object} createdItemViewsCache 
 * @param {object} jsonItemIDsCache 
 */
function _generateHelixDiagrams(documentationConfiguration, canvas, createdItemViewsCache, jsonItemIDsCache) {  
  // 1) CREATE THE HELIX ARCHITECTURE OBJECT
  var helixArchitecture = {};

  var __getLayerModule = function(item) { 
    var jsonItem = jsonItemIDsCache[item.ReferenceID]; // note that the input item is a lean version of the JsonFolder object, without children
    return {
      RootJsonItem: jsonItem,
      RootModel: createdItemViewsCache[item.ReferenceID].model,
      JsonTemplates: _getJsonTemplates(jsonItem)
    };
  };  

  var __getLayerByID = function(id) {
    return helixArchitecture.FoundationLayer.ReferenceID == id 
      ? helixArchitecture.FoundationLayer
      : helixArchitecture.FeatureLayer.ReferenceID == id 
        ? helixArchitecture.FeatureLayer
        : helixArchitecture.ProjectLayer; // assumes ID is always known
  };

  var rootView;

  // 2) INITIALIZE THE FOUNDATION LAYER
  helixArchitecture.FoundationLayer = {};
  if (documentationConfiguration.FoundationLayerRoot) {
    helixArchitecture.FoundationLayer.ReferenceID = documentationConfiguration.FoundationLayerRoot.ReferenceID;
    helixArchitecture.FoundationLayer.RootJsonItem = jsonItemIDsCache[helixArchitecture.FoundationLayer.ReferenceID];
    rootView = createdItemViewsCache[helixArchitecture.FoundationLayer.ReferenceID];
    helixArchitecture.FoundationLayer.RootModel = rootView ? rootView.model : undefined;
    helixArchitecture.FoundationLayer.Modules = documentationConfiguration.FoundationModuleFolders
      .map(function(leanJsonItem) {
        var jsonItem = jsonItemIDsCache[leanJsonItem.ReferenceID];
        return __getLayerModule(jsonItem);
      });
  } else {
    helixArchitecture.FoundationLayer.Modules = [];
  }

  // 3) INITIALIZE THE FEATURE LAYER
  helixArchitecture.FeatureLayer = {};
  
  if (documentationConfiguration.FeatureLayerRoot) {
    helixArchitecture.FeatureLayer.ReferenceID = documentationConfiguration.FeatureLayerRoot.ReferenceID;
    helixArchitecture.FeatureLayer.RootJsonItem = jsonItemIDsCache[helixArchitecture.FeatureLayer.ReferenceID];
    rootView = createdItemViewsCache[helixArchitecture.FeatureLayer.ReferenceID];
    helixArchitecture.FeatureLayer.RootModel = rootView ? rootView.model : undefined;
    helixArchitecture.FeatureLayer.Modules = documentationConfiguration.FeatureModuleFolders
      .map(function(leanJsonItem) {
        var jsonItem = jsonItemIDsCache[leanJsonItem.ReferenceID];
        return __getLayerModule(jsonItem);
      });
  } else {
    helixArchitecture.FeatureLayer.Modules = [];
  }

  // 4) INITIALIZE THE PROJECT LAYER
  helixArchitecture.ProjectLayer = {};
  if (documentationConfiguration.ProjectLayerRoot) {
    helixArchitecture.ProjectLayer.ReferenceID = documentationConfiguration.ProjectLayerRoot.ReferenceID;
    helixArchitecture.ProjectLayer.RootJsonItem = jsonItemIDsCache[helixArchitecture.ProjectLayer.ReferenceID];
    rootView = createdItemViewsCache[helixArchitecture.ProjectLayer.ReferenceID];
    helixArchitecture.ProjectLayer.RootModel = rootView ? rootView.model : undefined;
    helixArchitecture.ProjectLayer.Modules = documentationConfiguration.ProjectModuleFolders
      .map(function(leanJsonItem) {
        var jsonItem = jsonItemIDsCache[leanJsonItem.ReferenceID];
        return __getLayerModule(jsonItem);
      });
  } else {
    helixArchitecture.ProjectLayer.Modules = [];
  }

  // if none of the layers have the requisite data then just return
  if (!(helixArchitecture.FoundationLayer.ReferenceID || helixArchitecture.FeatureLayer.ReferenceID || helixArchitecture.ProjectLayer.ReferenceID)) {
    return;
  }

  // 5) INITIALIZE THE HIERARCHY INDEX
  var templateHierarchyIndex = {};
  
  var __initializeHierarchyIndexForLayer = function(layer) {
    layer.Modules.forEach(function(helixModule) {
      helixModule.JsonTemplates.forEach(function(jsonTemplate) {
        templateHierarchyIndex[jsonTemplate.ReferenceID] = {
          JsonTemplate: jsonTemplate, 
          ModuleID: helixModule.RootJsonItem.ReferenceID, 
          LayerID: layer.ReferenceID 
        };
      });    
    });
  };

  __initializeHierarchyIndexForLayer(helixArchitecture.FoundationLayer);
  __initializeHierarchyIndexForLayer(helixArchitecture.FeatureLayer);
  __initializeHierarchyIndexForLayer(helixArchitecture.ProjectLayer);

  // 6) CREATE DIAGRAMS FOR EACH LAYER & INITIALIZE TEMPLATE DEPENDENCIES CACHE
  var templateDependenciesCache = {};

  var __createDiagramsForLayer = function(layer) {
    // if the layer root was never set then don't generate diagrams for the layer
    if (!layer.ReferenceID) {
      return; 
    }

    // create the module and module templates diagrams
    layer.Modules.forEach(function(helixModule) {
      // MODULE DIAGRAM

      // create a cache to hold created views for the module diagram
      var createdModuleDiagramItemViewsCache = {};

      // create the class diagram for the module
      var moduleDiagram = new type.UMLClassDiagram();
      moduleDiagram._type = "UMLClassDiagram";
      moduleDiagram._parent =  helixModule.RootModel;
      moduleDiagram.name = `${helixModule.RootJsonItem.Name} Module Diagram`; 
      helixModule.RootModel.ownedElements.push(moduleDiagram);

      // add the view for the layer root package to the diagram
      var layerRootView = _createFolderView(
        layer.RootModel,
        moduleDiagram,
        canvas,
        createdModuleDiagramItemViewsCache);

      // add the view for the module root package to the diagram
      var moduleRootView = _createFolderView(
        helixModule.RootModel,
        moduleDiagram,
        canvas,
        createdModuleDiagramItemViewsCache);

      _createContainmentRelationshipView(moduleRootView, layerRootView, moduleDiagram, canvas);
          
      // set up the dependency views cache for the module
      var createdDependencyViewCache = {}; // cache for UMLDependencyView objects only

      // add the dependencies for the module
      helixModule.JsonTemplates
        .forEach(function (jsonTemplate) { 
          // get/add dependencies from/to cache for each template in the module
          var dependencies = templateDependenciesCache[jsonTemplate.ReferenceID];
          if (!dependencies) {
            dependencies = jsonTemplate.BaseTemplates
              .map(function(baseTemplateId) { 
                return {
                  SourceJsonTemplate: jsonTemplate,
                  TargetHierarchyModel: templateHierarchyIndex[baseTemplateId]
                };
              })
              .filter(function(dependency) { 
                return dependency && dependency.TargetHierarchyModel.ModuleID != helixModule.RootJsonItem.ReferenceID;
              });

            templateDependenciesCache[jsonTemplate.ReferenceID] = dependencies;
          }

          dependencies.forEach(function(dependency) {
            // create the documentation entry
            var documentationEntry = "{`" + dependency.SourceJsonTemplate.Path + "`} -> {`" + dependency.TargetHierarchyModel.JsonTemplate.Path + "`}";  
            
            // get the dependency view, if it exists
            var targetID = dependency.TargetHierarchyModel.ModuleID;
            var dependencyView = createdDependencyViewCache[targetID];

            // if dependency has already been added to the diagram then jsut update the documentation (don't add duplicates)
            if (dependencyView) {
              // append the dependency info to the existing documentaion
              dependencyView.model.documentation += "  \n" + documentationEntry;
            } else {
              // add the dependency to the diagram
              var targetModel = createdItemViewsCache[targetID].model;

              // create the dependency model
              var dependencyModel = _createDependencyRelationshipModel(
                helixModule.RootModel, 
                targetModel);
              
              // update the documentation for the dependency
              dependencyModel.documentation = documentationEntry;

              // add the view for the target module and it's containing layer to the diagram
              var dependencyLayerRootView = createdModuleDiagramItemViewsCache[dependency.TargetHierarchyModel.LayerID];
              if (!dependencyLayerRootView) {
                // add the dependency's layer view
                dependencyLayerRootView = _createFolderView(
                  __getLayerByID(dependency.TargetHierarchyModel.LayerID).RootModel,
                  moduleDiagram,
                  canvas,
                  createdModuleDiagramItemViewsCache);
              }

              // add the view for the dependency's module root package to the diagram
              var targetView = _createFolderView(
                targetModel,
                moduleDiagram,
                canvas,
                createdModuleDiagramItemViewsCache);

              // create the containment view from the dependency's module to its layer
              _createContainmentRelationshipView(targetView, dependencyLayerRootView, moduleDiagram, canvas);

              // create the dependency view
              var dependencyView = _createDependencyRelationshipView(dependencyModel, moduleRootView, targetView, moduleDiagram, canvas);
              createdDependencyViewCache[targetID] = dependencyView;
            }
          });
        });

      // layout the diagram  
      moduleDiagram.layout(LayoutOptions.ModuleDiagram); // TODO: move this to separate option


      // MODULE TEMPLATES DIAGRAM (showing the templates of the module and their relationship to all base templates)

      // create a cache to hold created views for the module diagram
      var createdModuleTemplatesDiagramItemViewsCache = {};

      // create the class diagram for the module
      var moduleTemplatesDiagram = new type.UMLClassDiagram();
      moduleTemplatesDiagram._type = "UMLClassDiagram";
      moduleTemplatesDiagram._parent =  helixModule.RootModel;
      moduleTemplatesDiagram.name = `${helixModule.RootJsonItem.Name} Module Templates Diagram`; 
      helixModule.RootModel.ownedElements.push(moduleTemplatesDiagram);

      // add the view for the layer root package to the diagram
      var layerRootView = _createFolderView(
        layer.RootModel,
        moduleTemplatesDiagram,
        canvas,
        createdModuleTemplatesDiagramItemViewsCache);

      // add the view for the module root package to the diagram
      var moduleRootView = _createFolderView(
        helixModule.RootModel,
        moduleTemplatesDiagram,
        canvas,
        createdModuleTemplatesDiagramItemViewsCache);

      // add the view for the parent-child relationship between the module root package and the layer root package
      _createContainmentRelationshipView(moduleRootView, layerRootView, moduleTemplatesDiagram, canvas);

      // loop through the module's templates and add each with its dependencies to the diagram
      helixModule.JsonTemplates.forEach(function(jsonTemplate) {
        // get the template's model
        var sourceModel = createdItemViewsCache[jsonTemplate.ReferenceID].model;

        // add the source template view to the diagram
        var sourceTemplateView = _createTemplateView(
          sourceModel,
          moduleTemplatesDiagram,
          canvas,
          createdModuleTemplatesDiagramItemViewsCache);
        
        // add the containment view relating the source template to the module root package
        _createContainmentRelationshipView(sourceTemplateView, moduleRootView, moduleTemplatesDiagram, canvas);

        // get dependencies from cache for each template in the module (should already be in cache from previous diagram generation logic)
        var dependencies = templateDependenciesCache[jsonTemplate.ReferenceID];

        // loop through dependencies and add each to diagram
        dependencies.forEach(function(dependency) {
          // add the view for the target module and it's containing layer to the diagram
          var mustCreateModuleView = false;
          var mustCreateTargetView = false;
          var dependencyLayerRootView = createdModuleTemplatesDiagramItemViewsCache[dependency.TargetHierarchyModel.LayerID];
          if (!dependencyLayerRootView) {
            // add the dependency's layer view
            dependencyLayerRootView = _createFolderView(
              __getLayerByID(dependency.TargetHierarchyModel.LayerID).RootModel,
              moduleTemplatesDiagram,
              canvas,
              createdModuleTemplatesDiagramItemViewsCache);
            
              mustCreateModuleView =
                mustCreateTargetView = true;
          }
          var dependencyModuleRootView; 
          if (mustCreateModuleView || !(dependencyModuleRootView = createdModuleTemplatesDiagramItemViewsCache[dependency.TargetHierarchyModel.ModuleID])) {
            dependencyModuleRootView = _createFolderView(
              createdItemViewsCache[dependency.TargetHierarchyModel.ModuleID].model,
              moduleTemplatesDiagram,
              canvas,
              createdModuleTemplatesDiagramItemViewsCache);

              mustCreateTargetView = true;

              // create the containment view from the dependency's module to its layer
              _createContainmentRelationshipView(
                dependencyModuleRootView, 
                dependencyLayerRootView, 
                moduleTemplatesDiagram, 
                canvas);
          }
          var targetView;
          if (mustCreateTargetView || !(targetView = createdModuleTemplatesDiagramItemViewsCache[dependency.TargetHierarchyModel.JsonTemplate.ReferenceID])) {
            // add the view for the dependency's module root package to the diagram
            targetView = _createFolderView(
              createdItemViewsCache[dependency.TargetHierarchyModel.JsonTemplate.ReferenceID].model,
              moduleTemplatesDiagram,
              canvas,
              createdModuleTemplatesDiagramItemViewsCache);

            // create the containment view from the dependency's target interface to its module root folder
            _createContainmentRelationshipView(
              targetView, 
              dependencyModuleRootView, 
              moduleTemplatesDiagram, 
              canvas);
          }

          // create the dependency model
          var dependencyModel = _createDependencyRelationshipModel(
            sourceModel, 
            targetView.model);
          
          // set the documentation for the dependency
          var documentationEntry = "{`" + dependency.SourceJsonTemplate.Path + "`} -> {`" + dependency.TargetHierarchyModel.JsonTemplate.Path + "`}";  
          dependencyModel.documentation = documentationEntry;

          // create the dependency view
          var dependencyView = _createDependencyRelationshipView(
            dependencyModel, 
            moduleRootView, 
            targetView, 
            moduleTemplatesDiagram, 
            canvas);
        });
      });  

      // layout the diagram  
      moduleTemplatesDiagram.layout(LayoutOptions.TemplatesDiagram); // TODO: move this to separate option
    });


    // LAYER DIAGRAM

    // create a cache to hold created views for the layer diagram
    var createdLayerItemViewsCache = {};

    // create a cache to hold the created dependency views for the layer diagram
    var createdLayerDependencyViewsCache = {};

    // create the class diagram for the layer
    var layerDiagram = new type.UMLClassDiagram();
    layerDiagram._type = "UMLClassDiagram";
    layerDiagram._parent = layer.RootModel;
    layerDiagram.name = `${layer.RootJsonItem.Name} Layer Diagram`;
    layer.RootModel.ownedElements.push(layerDiagram);

    // add the view for the layer root package to the diagram
    var layerRootView = _createFolderView(
      layer.RootModel,
      layerDiagram,
      canvas,
      createdLayerItemViewsCache);

    // loop through the layer's modules and add their dependencies to the diagram
    layer.Modules.forEach(function(helixModule) {
      // loop though the module's templates and add the dependencies for each to the diagram
      helixModule.JsonTemplates.forEach(function(jsonTemplate) {
        // get the dependencies for the template from the cache
        var dependencies = templateDependenciesCache[jsonTemplate.ReferenceID];

        // loop through the template's dependencies and add each (if not already added) to the diagram
        dependencies.forEach(function (dependency) {
          // set up the documentation entry
          var documentationEntry = "{`" + dependency.SourceJsonTemplate.Path + "`} -> {`" + dependency.TargetHierarchyModel.JsonTemplate.Path + "`}";  

          // if the dependency's layer is not on the diagram then add it
          var targetView = createdLayerItemViewsCache[dependency.TargetHierarchyModel.LayerID];
          var targetModel;
          var mustCreateDependency = false;
          if (!targetView) {
            // get the target layer's model
            targetModel = __getLayerByID(dependency.TargetHierarchyModel.LayerID).RootModel;

            // add the target layer to the diagram
            targetView = _createFolderView(
              targetModel,
              layerDiagram,
              canvas,
              createdLayerItemViewsCache);

            // layer was drawn for first time so definitely need to create the dependency
            mustCreateDependency = true;
          } else {
            targetModel = targetView.model;
          }

          // if the dependency has to be created or if it hasn't yet been drawn (should be true for new deps and those that point at the source layer)
          var dependencyView = createdLayerDependencyViewsCache[targetModel._id];
          if (mustCreateDependency || !dependencyView) {
            // create the dependency model
            var dependencyModel = _createDependencyRelationshipModel(
              layer.RootModel,
              targetView.model);              

            // add the dependency view to the diagram
            dependencyView = _createDependencyRelationshipView(
              dependencyModel, 
              layerRootView, 
              targetView, 
              layerDiagram, 
              canvas); 
            
            // add the view to the cache
            createdLayerDependencyViewsCache[targetModel._id] = dependencyView;

            // set the documentation for the dependency            
            dependencyModel.documentation = documentationEntry;
          } else {
            // the dependency has already been drawn so update the documentation entry
            dependencyView.model.documentation += "  \n" + documentationEntry;
          }
        });
      });
    });

    // layout the layer diagram
    layerDiagram.layout(LayoutOptions.TemplatesDiagram); // TODO: move this to separate option
  };

  __createDiagramsForLayer(helixArchitecture.FoundationLayer);
  __createDiagramsForLayer(helixArchitecture.FeatureLayer);
  __createDiagramsForLayer(helixArchitecture.ProjectLayer);
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
 * Reverse engineers the mdj file for the given architecture and returns the local path to the resulting file
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

  // check if DocumentationConfiguration is present
  var hasDocConfig = architecture.DocumentationConfiguration || false;

  // merge the user specified layout options with the defaults
  layoutOptions = extend(new LayoutOptions(), layoutOptions);

  // make the canvas fallback to a new canvas with default values
  canvas = canvas || createCanvas();

  /* 1) CREATE BASIC ENTITIES: PROJECT, ROOT MODEL, TEMPLATES DIAGRAM, AND CLASS DIAGRAMS */

  // create the projet
  var project = new type.Project();
  project._type = "Project";
  project.name = architecture.DocumentationConfiguration && architecture.DocumentationConfiguration.DocumentationTitle 
    ? architecture.DocumentationConfiguration.DocumentationTitle
    : "Untitled";

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

  // create the map objects to use for storing the mappings from the created items' IDs to their views and item IDs to JSON items
  var createdItemViewsCache = {};
  var jsonItemIDsCache = {};

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
      jsonItemIDsCache[jsonItem.ReferenceID] = jsonItem;
      
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

  /* 5) CREATE, CLEANUP AND REFORMAT THE HELIX DIAGRAMS */
  _generateHelixDiagrams(
    architecture.DocumentationConfiguration, 
    canvas, 
    createdItemViewsCache, 
    jsonItemIDsCache);
  

  // serialize the project to JSON
  var mdjcontent = mdjson.Repository.writeObject(project);

  fs.writeFileSync(outputFilePath, mdjcontent, "utf8");
  logger.info(`MDJ created at path "${outputFilePath}"`);

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
    mdjson.Repository.clear();
    logger.info(`HTML Documentation Generated at path "${outputFolderPath}"`);
  } catch (error) {
    logger.error(error);
    return;
  }
};

/**
 * Generates the HTML documentation for the given metadata-json file, zips it and then executes a callback
 * @param {String} mdjFilePath path to the metadata-json file to generate the docs from
 * @param {String} docFolderPath the output folder location where the uncompressed docs are to be stored
 * @param {String} archiveFilePath the file location where the compressed docs are to be stored
 * @param {function} successCallback the callback to execute after the docs have successfully finished being archived
 * @param {function} errorCallback the callback to execute if the archiving process fails
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