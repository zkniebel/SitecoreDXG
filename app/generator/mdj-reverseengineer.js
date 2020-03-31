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

// third-party
const mdjson = require("metadata-json");
const nodeCanvas = require("canvas").createCanvas;
const extend = require("extend");

const _dagre = require("dagre");
const _graphlib = require("graphlib");

// local
const fileUtils = require("../common/file-utils.js");
const logger = require("../common/logging.js").logger;

const Sitecore_Types = require("../../serializer/types/sitecore.js");
const Documentation_Types = require("../../serializer/types/documentation.js");
const Sitecore_Constants = require("../../serializer/constants/sitecore.js");

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
 * @param {string} lineColor (optional) hex code to set the view's line color to
 * @returns {UMLDependencyView}
 */
function _createDependencyRelationshipView(model, sourceView, targetView, diagram, canvas, lineColor) {
  var view = new type.UMLDependencyView();
  view._type = "UMLDependencyView";
  view.model = model;
  view.tail = sourceView;
  view.head = targetView;

  if (lineColor) {
    view.lineColor = lineColor;
  }

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
 * @param {Sitecore_Types.TemplateField} jsonField the field to create the attribtue from
 * @param {Sitecore_Types.TemplateSection} jsonSection the section under which the field is stored 
 * @param {UMLInterface} templateModel the template to add the new attribute model to
 * @returns {UMLAttribute}
 */
function _createFieldModel(jsonField, jsonSection, templateModel) {
  var model = new type.UMLAttribute();
  model._type = "UMLAttribute";
  model._parent = templateModel;
  model.name = jsonField.Name;
  model.type = jsonField.FieldType;

  var title = jsonField.getLanguages()
    .map((language) => 
      `  \n  - ${JSON.stringify(language)}:  \`${JSON.stringify(jsonField.getFieldValue(Sitecore_Constants.TEMPLATE_FIELD_TITLE_FIELD_ID, language))}\``)
    .join('');

  model.documentation =
    "**Title:** " + title + "  \n" +
    "**SectionName:** `" + JSON.stringify(jsonSection.Name) + "`  \n" +
    "**Source:** `" + JSON.stringify(jsonField.Source) + "`  \n" +
    "**Shared:** `" + JSON.stringify(jsonField.Shared) + "`  \n" +
    "**Unversioned:** `" + JSON.stringify(jsonField.Unversioned) + "`  \n";

  model.ownedElements = [
    _createTagModel("Title", "string", title),
    _createTagModel("SectionName", "string", jsonSection.Name),
    _createTagModel("Source", "string", jsonField.Source),
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
  * @param {Sitecore_Types.Template} jsonTemplate the template item to create the model and view for
  * @param {Model} parentModel the parent model
  * @returns {UMLInterface}
 */
function _createTemplateModel(jsonTemplate, parentModel) {
  var model = new type.UMLInterface();
  model._type = "UMLInterface";
  model._id = jsonTemplate.ID;
  model._parent = parentModel
  model.name = jsonTemplate.Name;

  parentModel.ownedElements.push(model);

  jsonTemplate.TemplateSections.forEach((jsonSection) => {
    jsonSection.TemplateFields.forEach((jsonField) => {
      _createFieldModel(jsonField, jsonSection, model);
    });
  });

  model.documentation = `**ID:** \`{${jsonTemplate.ID.toUpperCase()}}\``;

  // TODO: add support for creating a Standard Values model as a child of the Template model

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
  * @param {Sitecore_Types.TemplateFolder} jsonFolder the folder item to create the model and view for
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
  model._id = jsonFolder.ID;
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
  * @param {Sitecore_Types.Template} jsonTemplate the JSON template item
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
  return (jsonItem instanceof Sitecore_Types.Template)
    ? _createTemplateModelAndView(jsonItem, parentModel, templatesDiagram, canvas, createdItemViewsCache)
    : _createFolderModelAndView(jsonItem, parentModel, templatesDiagram, templateFoldersDiagram, canvas, createdItemViewsCache);
};

/**
 * Gets a flat array of JSON items from the given JSON item
 * @param {Sitecore_Types.Item} jsonItem the item to get the array of JSON items from
 * @returns {Array<Sitecore_Types.Item>}
 */
function _getJsonItems(jsonItem) {
  return (jsonItem instanceof Sitecore_Types.Template)
    ? [jsonItem]
    : (jsonItem instanceof Sitecore_Types.TemplateFolder)
      ? [jsonItem]
        .concat(jsonItem.Children
          .map(_getJsonItems))
        .reduce(function (result, entry) { return result.concat(entry); }, [])
      : [];
};

/**
 * Gets a flat array of JSON templates from the given JSON item
 * @param {JsonItem} jsonItem the item to get the array of JSON templates from
 * @returns {Array<JsonTemplate>}
 */
function _getJsonTemplates(jsonItem) {
  return (jsonItem instanceof Sitecore_Types.Template)
    ? [jsonItem]
    : jsonItem.Children
      .map(_getJsonTemplates)
      .reduce(function (result, entry) { return result.concat(entry); }, []);
};

/**
 * Generates the helix diagrams for the architecture based on the given documentation configuration
 * @param {Documentation_Types.Metaball} metaball
 * @param {Documentation_Types.HelixDatabaseMap} helixDatabaseMap
 * @param {Canvas} canvas 
 * @param {object} createdItemViewsCache 
 * @param {object} jsonItemIDsCache 
 * @param {object} inheritanceModelsCache
 * @param {object} layoutOptions 
 */
function _generateHelixDiagrams(metaball, helixDatabaseMap, canvas, createdItemViewsCache, jsonItemIDsCache, inheritanceModelsCache, layoutOptions) {
  var __getLayerModuleByID = function(itemID) { 
    var jsonItem = jsonItemIDsCache[itemID]; // note that the input item is a lean version of the JsonFolder object, without children
    if (!jsonItem || !jsonItem.ID) {
      logger.error(`Module folder with ID "{${itemID.toUpperCase()}}" was not found. It is likely that this item is referenced in your configuration but does not exist in the serialized data`);
      return;
    }
    return {
      RootJsonItem: jsonItem,
      RootModel: createdItemViewsCache[jsonItem.ID].model,
      JsonTemplates: _getJsonTemplates(jsonItem)
    };
  }; 

  var __createLayerInfo = function(layerRootID, layerModuleFolderIDs, layerIndex) {
    var layer = {};
    var layerRoot = jsonItemIDsCache[layerRootID];
    if (layerRoot) {
      layer.ID = layerRoot.ID;
      layer.LayerIndex = layerIndex;
      layer.RootJsonItem = jsonItemIDsCache[layer.ID];
      const rootView = createdItemViewsCache[layer.ID];
      layer.RootModel = rootView ? rootView.model : undefined;
      layer.Modules = layerModuleFolderIDs
        .map(function(layerModuleFolderID) {
          return __getLayerModuleByID(layerModuleFolderID);
        })
        .filter((layerModule) => typeof layerModule !== "undefined");

      metaball.ValidationErrors[layerIndex] = { Name: layer.RootJsonItem.Name, Entries: [] };
    } else {
      layer.Modules = [];
    }

    return layer;
  };
  
  // 1) CREATE THE HELIX ARCHITECTURE OBJECT
  var helixArchitecture = {
    FoundationLayer: __createLayerInfo(helixDatabaseMap.Foundation.RootID, helixDatabaseMap.Foundation.ModuleFolderIDs, 0),
    FeatureLayer: __createLayerInfo(helixDatabaseMap.Feature.RootID, helixDatabaseMap.Feature.ModuleFolderIDs, 1),
    ProjectLayer: __createLayerInfo(helixDatabaseMap.Project.RootID, helixDatabaseMap.Project.ModuleFolderIDs, 2)
  };

  // 2) STOP IF NONE OF THE LAYERS HAVE THE REQUISITE DATA
  if (!(helixArchitecture.FoundationLayer.ID || helixArchitecture.FeatureLayer.ID || helixArchitecture.ProjectLayer.ID)) {
    return;
  }

  // 3) INITIALIZE THE HIERARCHY INDEX
  var templateHierarchyIndex = {};
  
  var __initializeHierarchyIndexForLayer = function(layer) {
    layer.Modules.forEach(function(helixModule) {
      helixModule.JsonTemplates.forEach(function(jsonTemplate) {
        templateHierarchyIndex[jsonTemplate.ID] = {
          JsonTemplate: jsonTemplate, 
          ModuleID: helixModule.RootJsonItem.ID, 
          LayerID: layer.ID 
        };
      });    
    });
  };

  __initializeHierarchyIndexForLayer(helixArchitecture.FoundationLayer);
  __initializeHierarchyIndexForLayer(helixArchitecture.FeatureLayer);
  __initializeHierarchyIndexForLayer(helixArchitecture.ProjectLayer);

  // 4) CREATE DIAGRAMS FOR EACH LAYER & INITIALIZE TEMPLATE DEPENDENCIES CACHES
  var templateDependenciesCache = {};
  var templateDependentsCache = {};  

  // validates the dependency described by the given source and target hierarchy models   
  var __validateDependency = function(sourceHierarchyModel, targetHierarchyModel) {
    // any template can depend on another template within the same layer
    if (sourceHierarchyModel.ModuleID == targetHierarchyModel.ModuleID) {
      return { IsValid: true };
    }

    var sourceLayerID = sourceHierarchyModel.LayerID;
    var targetLayerID = targetHierarchyModel.LayerID;

    var ___addValidationErrorToMetaball = function(layerIndex) {
      var sourceModule = jsonItemIDsCache[sourceHierarchyModel.ModuleID];
      var entry = {
        ModuleName: sourceModule.Name,
        DependentPath: sourceHierarchyModel.JsonTemplate.Path,
        DependencyPath: targetHierarchyModel.JsonTemplate.Path 
      };

      metaball.ValidationErrors[layerIndex].Entries.push(entry);
      metaball.ValidationErrorsDetected = true;
    };

    if (targetLayerID == helixArchitecture.ProjectLayer.ID) {
        // project -> project
        if (sourceLayerID == helixArchitecture.ProjectLayer.ID) {
            ___addValidationErrorToMetaball(helixArchitecture.ProjectLayer.LayerIndex);
            return { 
                IsValid: false, 
                Message: `INVALID: Templates in the Project Layer cannot depend on templates from other modules in the Project Layer: "${sourceHierarchyModel.JsonTemplate.Path}"->"${targetHierarchyModel.JsonTemplate.Path}"`
            };
        }
        // feature -> project
        if (sourceLayerID == helixArchitecture.FeatureLayer.ID) {
            ___addValidationErrorToMetaball(helixArchitecture.FeatureLayer.LayerIndex);
            return { 
                IsValid: false, 
                Message: `INVALID: Templates in the Feature Layer cannot depend on templates in the Project Layer: "${sourceHierarchyModel.JsonTemplate.Path}"->"${targetHierarchyModel.JsonTemplate.Path}"`
            };
        }
        // foundation -> project
        if (sourceLayerID == helixArchitecture.FoundationLayer.ID) {
            ___addValidationErrorToMetaball(helixArchitecture.FoundationLayer.LayerIndex);
            return { 
                IsValid: false, 
                Message: `INVALID: Templates in the Foundation Layer cannot depend on templates in the Project Layer: "${sourceHierarchyModel.JsonTemplate.Path}"->"${targetHierarchyModel.JsonTemplate.Path}"`
            };            
        }
    } 
    
    if (targetLayerID == helixArchitecture.FeatureLayer.ID) {
        // feature -> feature
        if (sourceLayerID == helixArchitecture.FeatureLayer.ID) {
            ___addValidationErrorToMetaball(helixArchitecture.FeatureLayer.LayerIndex);
            return { 
                IsValid: false, 
                Message: `INVALID: Templates in the Feature Layer cannot depend on templates from other modules in the Feature Layer: "${sourceHierarchyModel.JsonTemplate.Path}"->"${targetHierarchyModel.JsonTemplate.Path}"`
            };
        }
    
        // foundation -> feature
        if (sourceLayerID == helixArchitecture.FoundationLayer.ID) {
            ___addValidationErrorToMetaball(helixArchitecture.FoundationLayer.LayerIndex);
            return { 
                IsValid: false, 
                Message: `INVALID: Templates in the Foundation Layer cannot depend on templates in the Feature Layer: "${sourceHierarchyModel.JsonTemplate.Path}"->"${targetHierarchyModel.JsonTemplate.Path}"`
            };            
        }
    }

    return { IsValid: true };
  };

  var __initializeDependencyCachesByLayer = function (layer) {
    layer.Modules.forEach(function(helixModule) {
      helixModule.JsonTemplates.forEach(function(jsonTemplate) {
        // initialize the outgoing dependencies
        dependencies = jsonTemplate.BaseTemplates
          .map(function(baseTemplateId) { 
            return {
              SourceJsonTemplate: jsonTemplate,
              SourceHierarchyModel: templateHierarchyIndex[jsonTemplate.ID],
              TargetHierarchyModel: templateHierarchyIndex[baseTemplateId]
            };
          })
          .filter(function(dependency) { 
            if (!dependency.TargetHierarchyModel) {
              logger.warn(`The dependency item with ID "${dependency.SourceJsonTemplate.ID}" was documented but does not belong to a specified Helix Module, and so it will be excluded from the dependencies of the "${jsonTemplate.ID}" item. If the dependency template belongs to a Helix module, please make sure that its module is selected in the Documentation Configuration item in Sitecore.`);
              return false;
            }
            return true;
          })
          .map(function(dependency) {
            var validationResult = __validateDependency(
              dependency.SourceHierarchyModel, 
              dependency.TargetHierarchyModel);

            dependency.IsValid = validationResult.IsValid;
            dependency.ValidationMessage = validationResult.Message;

            return dependency;
          });
        templateDependenciesCache[jsonTemplate.ID] = dependencies; 

        // initialize the incoming dependencies
        dependencies.forEach(function(dependency) {
          var dependencyJsonTemplate = dependency.TargetHierarchyModel.JsonTemplate;
          var dependencyId = dependencyJsonTemplate.ID;          

          (templateDependentsCache[dependencyId] || (templateDependentsCache[dependencyId] = [])).push({ 
            SourceHierarchyModel: dependency.SourceHierarchyModel,
            TargetHierarchyModel: dependency.TargetHierarchyModel,
            TargetJsonTemplate: dependencyJsonTemplate,
            IsValid: dependency.IsValid,
            ValidationMessage: dependency.ValidationMessage
          }); 
        });  
        
        // add an empty array to the cache if dependents havne't already been added in order to ensure that there is alayws an initialized array for each template
        templateDependentsCache[jsonTemplate.ID] = templateDependentsCache[jsonTemplate.ID] || [];
      });
    });
  };

  // initialize the dependencies for each layer
  __initializeDependencyCachesByLayer(helixArchitecture.FoundationLayer);
  __initializeDependencyCachesByLayer(helixArchitecture.FeatureLayer);
  __initializeDependencyCachesByLayer(helixArchitecture.ProjectLayer);

  // set up the dependent models cache (to ensure that depencency models are only added once)
  var createdDependencyModelCache = {};

  var __createDiagramsForLayer = function(layer) {
    // if the layer root was never set then don't generate diagrams for the layer
    if (!layer.ID) {
      return; 
    }    

    var __getLayerByID = function(id) {
      return helixArchitecture.FoundationLayer.ID == id 
        ? helixArchitecture.FoundationLayer
        : helixArchitecture.FeatureLayer.ID == id 
          ? helixArchitecture.FeatureLayer
          : helixArchitecture.ProjectLayer; // assumes ID is always known
    }; 

    // create the module and module templates diagrams
    layer.Modules.forEach(function(helixModule) {
      // MODULE DIAGRAM

      // create a cache to hold created views for the module diagram
      var createdModuleDiagramItemViewsCache = {};

      // create the class diagram for the module
      var moduleDiagram = new type.UMLClassDiagram();
      moduleDiagram._type = "UMLClassDiagram";
      moduleDiagram._parent =  helixModule.RootModel;
      moduleDiagram.name = `${helixModule.RootJsonItem.Name} Dependencies Diagram`; 
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
          var dependencies = templateDependenciesCache[jsonTemplate.ID]
            // this is the module diagram, so we don't show dependencies from one template in the module on another template that's also in the module
            .filter(function(dependency) {
              return dependency.SourceHierarchyModel.ModuleID != dependency.TargetHierarchyModel.ModuleID;  
            });
          if (!dependencies.length) {
            return;
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

              // create the dependency model if it doesn't already exist
              var dependencyModelCacheKey = `"${helixModule.RootJsonItem.ID}"->"${targetID}"`;
              var dependencyModel = createdDependencyModelCache[dependencyModelCacheKey];
              if (!dependencyModel) {
                dependencyModel = _createDependencyRelationshipModel(
                  helixModule.RootModel,
                  targetModel);
                createdDependencyModelCache[dependencyModelCacheKey] = dependencyModel;
              } 
              
              // update the documentation for the dependency
              if (dependency.ValidationMessage) {
                documentationEntry = dependency.ValidationMessage + "  \n\n";
              }
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
              var dependencyView = _createDependencyRelationshipView(dependencyModel, moduleRootView, targetView, moduleDiagram, canvas, dependency.IsValid ? undefined : "#ff0000");
              createdDependencyViewCache[targetID] = dependencyView;
            }
          });
        });

      // layout the diagram  
      moduleDiagram.layout(layoutOptions.ModuleDiagram); // TODO: move this to separate option

      
      // MODULE DEPENDENTS DIAGRAM

      // create a cache to hold created views for the module dependents diagram
      var createdModuleDependentsDiagramItemViewsCache = {};

      // create the class diagram for the module
      var moduleDependentsDiagram = new type.UMLClassDiagram();
      moduleDependentsDiagram._type = "UMLClassDiagram";
      moduleDependentsDiagram._parent =  helixModule.RootModel;
      moduleDependentsDiagram.name = `${helixModule.RootJsonItem.Name} Dependents Diagram`; 
      helixModule.RootModel.ownedElements.push(moduleDependentsDiagram);

      // add the view for the layer root package to the diagram
      var layerRootView = _createFolderView(
        layer.RootModel,
        moduleDependentsDiagram,
        canvas,
        createdModuleDependentsDiagramItemViewsCache);

      // add the view for the module root package to the diagram
      var moduleRootView = _createFolderView(
        helixModule.RootModel,
        moduleDependentsDiagram,
        canvas,
        createdModuleDependentsDiagramItemViewsCache);

      _createContainmentRelationshipView(moduleRootView, layerRootView, moduleDependentsDiagram, canvas);
          
      // set up the dependent views cache for the module
      var createdDependentViewCache = {}; // cache for UMLDependencyView objects only

      // add the dependents for the module
      helixModule.JsonTemplates
        .forEach(function (jsonTemplate) { 
          // get/add dependents from/to cache for each template in the module
          var dependents = templateDependentsCache[jsonTemplate.ID]
            // this is the module dependents diagram, so we don't show dependents from one template in the module on another template that's also in the module
            .filter(function(dependent) {
              return dependent.SourceHierarchyModel.ModuleID != dependent.TargetHierarchyModel.ModuleID;  
            });
          if (!dependents.length) {
            return;
          }

          dependents.forEach(function(dependent) {
            // get the dependent view, if it exists
            var sourceID = dependent.SourceHierarchyModel.ModuleID;
            var dependentView = createdDependentViewCache[sourceID];

            // if dependent has already been added to the diagram then move to next dependent (don't add duplicates)
            if (!dependentView) {
              // add the dependent to the diagram
              var sourceModel = createdItemViewsCache[sourceID].model;

              // create the dependency model if it doesn't already exist
              var dependencyModelCacheKey = `"${sourceID}"->"${helixModule.RootJsonItem.ID}"`;
              var dependencyModel = createdDependencyModelCache[dependencyModelCacheKey];
              if (!dependencyModel) {
                dependencyModel = _createDependencyRelationshipModel(
                  sourceModel,
                  helixModule.RootModel);
                createdDependencyModelCache[dependencyModelCacheKey] = dependencyModel;
              } 

              // add the view for the dependent module and it's containing layer to the diagram
              var dependentLayerRootView = createdModuleDependentsDiagramItemViewsCache[dependent.SourceHierarchyModel.LayerID];
              if (!dependentLayerRootView) {
                // add the dependent's layer view
                dependentLayerRootView = _createFolderView(
                  __getLayerByID(dependent.SourceHierarchyModel.LayerID).RootModel,
                  moduleDependentsDiagram,
                  canvas,
                  createdModuleDependentsDiagramItemViewsCache);
              }

              // add the view for the dependent's module root package to the diagram
              var sourceView = _createFolderView(
                sourceModel,
                moduleDependentsDiagram,
                canvas,
                createdModuleDependentsDiagramItemViewsCache);

              // create the containment view from the dependent's module to its layer
              _createContainmentRelationshipView(sourceView, dependentLayerRootView, moduleDependentsDiagram, canvas);

              // create the dependent view
              var dependentView = _createDependencyRelationshipView(dependencyModel, sourceView, moduleRootView, moduleDependentsDiagram, canvas, dependent.IsValid ? undefined : "#ff0000");
              createdDependentViewCache[sourceID] = dependentView;
            }
          });
        });

      // layout the diagram  
      moduleDependentsDiagram.layout(layoutOptions.ModuleDiagram); // TODO: move this to separate option
      


      // MODULE TEMPLATES DIAGRAM (showing the templates of the module and their relationship to all base templates)

      // create a cache to hold created views for the module diagram
      var createdModuleTemplatesDiagramItemViewsCache = {};

      // create the class diagram for the module
      var moduleTemplatesDiagram = new type.UMLClassDiagram();
      moduleTemplatesDiagram._type = "UMLClassDiagram";
      moduleTemplatesDiagram._parent =  helixModule.RootModel;
      moduleTemplatesDiagram.name = `${helixModule.RootJsonItem.Name} Templates Dependencies Diagram`; 
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
        var sourceModel = createdItemViewsCache[jsonTemplate.ID].model;

        // add the source template view to the diagram
        var sourceTemplateView = _createTemplateView(
          sourceModel,
          moduleTemplatesDiagram,
          canvas,
          createdModuleTemplatesDiagramItemViewsCache);
        
        // add the containment view relating the source template to the module root package
        _createContainmentRelationshipView(sourceTemplateView, moduleRootView, moduleTemplatesDiagram, canvas);

        // get dependencies from cache for each template in the module (should already be in cache from previous diagram generation logic)
        var dependencies = templateDependenciesCache[jsonTemplate.ID];

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
            // add the view for the dependency's module root package to the diagram
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
          if (mustCreateTargetView || !(targetView = createdModuleTemplatesDiagramItemViewsCache[dependency.TargetHierarchyModel.JsonTemplate.ID])) {
            // add the view for the dependency's template interface to the diagram
            targetView = _createTemplateView(
              createdItemViewsCache[dependency.TargetHierarchyModel.JsonTemplate.ID].model,
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

          // create the dependency model if it doesn't already exist
          var dependencyModelCacheKey = `"${dependency.SourceJsonTemplate.ID}"->"${dependency.TargetHierarchyModel.JsonTemplate.ID}"`;
          var dependencyModel = inheritanceModelsCache[dependencyModelCacheKey];
          if (!dependencyModel) {
            var msg = `Error: dependency model should already exist as a generalization for dependency with key "${dependencyModelCacheKey}"`;
            logger.error(msg);
            throw msg;
          } 
          
          // update the documentation for the dependency
          var documentationEntry = "{`" + dependency.SourceJsonTemplate.Path + "`} -> {`" + dependency.TargetHierarchyModel.JsonTemplate.Path + "`}";  
          if (dependency.ValidationMessage) {
            documentationEntry = dependency.ValidationMessage + "  \n\n";
          }
          dependencyModel.documentation = documentationEntry;
          
          // create the dependency view
          var dependencyView = _createBaseTemplateRelationshipView(
            dependencyModel, 
            sourceTemplateView, 
            targetView, 
            moduleTemplatesDiagram, 
            canvas,
            dependency.IsValid ? undefined : "#ff0000");
        });
      });  

      // layout the diagram  
      moduleTemplatesDiagram.layout(layoutOptions.TemplatesDiagram); // TODO: move this to separate option
      


      // MODULE TEMPLATES DEPENDENTS DIAGRAM (showing the dependents of the templates of the module)

      // create a cache to hold created views for the module diagram
      var createdModuleTemplatesDependentsDiagramItemViewsCache = {};

      // create the class diagram for the module
      var moduleTemplatesDependentsDiagram = new type.UMLClassDiagram();
      moduleTemplatesDependentsDiagram._type = "UMLClassDiagram";
      moduleTemplatesDependentsDiagram._parent =  helixModule.RootModel;
      moduleTemplatesDependentsDiagram.name = `${helixModule.RootJsonItem.Name} Templates Dependents Diagram`; 
      helixModule.RootModel.ownedElements.push(moduleTemplatesDependentsDiagram);

      // add the view for the layer root package to the diagram
      var layerRootView = _createFolderView(
        layer.RootModel,
        moduleTemplatesDependentsDiagram,
        canvas,
        createdModuleTemplatesDependentsDiagramItemViewsCache);

      // add the view for the module root package to the diagram
      var moduleRootView = _createFolderView(
        helixModule.RootModel,
        moduleTemplatesDependentsDiagram,
        canvas,
        createdModuleTemplatesDependentsDiagramItemViewsCache);

      // add the view for the parent-child relationship between the module root package and the layer root package
      _createContainmentRelationshipView(moduleRootView, layerRootView, moduleTemplatesDependentsDiagram, canvas);

      // loop through the module's templates and add each with its dependents to the diagram
      helixModule.JsonTemplates.forEach(function(jsonTemplate) {
        // get the template's model
        var targetModel = createdItemViewsCache[jsonTemplate.ID].model;

        // add the template view to the diagram
        var targetView = _createTemplateView(
          targetModel,
          moduleTemplatesDependentsDiagram,
          canvas,
          createdModuleTemplatesDependentsDiagramItemViewsCache);
        
        // add the containment view relating the source template to the module root package
        _createContainmentRelationshipView(targetView, moduleRootView, moduleTemplatesDependentsDiagram, canvas);

        // get the templates dependents from the cache
        var dependents = templateDependentsCache[jsonTemplate.ID];
        if (!dependents.length) {
          return;
        }

        // loop through dependents and add each to diagram
        dependents.forEach(function(dependent) {
          // add the view for the source module and it's containing layer to the diagram
          var mustCreateModuleView = false;
          var mustCreateSourceView = false;
          var dependentLayerRootView = createdModuleTemplatesDependentsDiagramItemViewsCache[dependent.SourceHierarchyModel.LayerID];
          if (!dependentLayerRootView) {
            // add the dependent's layer view
            dependentLayerRootView = _createFolderView(
              __getLayerByID(dependent.SourceHierarchyModel.LayerID).RootModel,
              moduleTemplatesDependentsDiagram,
              canvas,
              createdModuleTemplatesDependentsDiagramItemViewsCache);
            
              mustCreateModuleView =
                mustCreateSourceView = true;
          }
          var dependentModuleRootView; 
          if (mustCreateModuleView || !(dependentModuleRootView = createdModuleTemplatesDependentsDiagramItemViewsCache[dependent.SourceHierarchyModel.ModuleID])) {
            // add the view for the dependent's module root package to the diagram
            dependentModuleRootView = _createFolderView(
              createdItemViewsCache[dependent.SourceHierarchyModel.ModuleID].model,
              moduleTemplatesDependentsDiagram,
              canvas,
              createdModuleTemplatesDependentsDiagramItemViewsCache);

              mustCreateTargetView = true;

              // create the containment view from the dependent's module to its layer
              _createContainmentRelationshipView(
                dependentModuleRootView, 
                dependentLayerRootView, 
                moduleTemplatesDependentsDiagram, 
                canvas);
          }
          var sourceView;
          if (mustCreateSourceView || !(sourceView = createdModuleTemplatesDependentsDiagramItemViewsCache[dependent.SourceHierarchyModel.JsonTemplate.ID])) {
            // add the view for the dependent's template interface to the diagram
            sourceView = _createTemplateView(
              createdItemViewsCache[dependent.SourceHierarchyModel.JsonTemplate.ID].model,
              moduleTemplatesDependentsDiagram,
              canvas,
              createdModuleTemplatesDependentsDiagramItemViewsCache);

            // create the containment view from the dependent's target interface to its module root folder
            _createContainmentRelationshipView(
              sourceView, 
              dependentModuleRootView, 
              moduleTemplatesDependentsDiagram, 
              canvas);
          }
          
          // create the dependency model if it doesn't already exist
          var dependencyModelCacheKey = `"${dependent.SourceHierarchyModel.JsonTemplate.ID}"->"${dependent.TargetJsonTemplate.ID}"`;
          var dependencyModel = inheritanceModelsCache[dependencyModelCacheKey];
          if (!dependencyModel) {
            var msg = `Error: dependency model should already exist as a generalization for dependency with key "${dependencyModelCacheKey}"`;
            logger.error(msg);
            throw msg;
          } 
          
          // create the dependency view
          var dependencyView = _createBaseTemplateRelationshipView(
            dependencyModel, 
            sourceView, 
            targetView, 
            moduleTemplatesDependentsDiagram, 
            canvas,
            dependent.IsValid ? undefined : "#ff0000");
        });
      });  

      // layout the diagram  
      moduleTemplatesDependentsDiagram.layout(layoutOptions.TemplatesDiagram); // TODO: move this to separate option
    });


    // LAYER DEPENDENCIES DIAGRAM

    // create a cache to hold created views for the layer diagram
    var createdLayerItemViewsCache = {};

    // create a cache to hold the created dependency views for the layer diagram
    var createdLayerDependencyViewsCache = {};

    // create the class diagram for the layer
    var layerDiagram = new type.UMLClassDiagram();
    layerDiagram._type = "UMLClassDiagram";
    layerDiagram._parent = layer.RootModel;
    layerDiagram.name = `${layer.RootJsonItem.Name} Dependencies Diagram`;
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
        var dependencies = templateDependenciesCache[jsonTemplate.ID]
          // this is the layer diagram, so we don't show dependencies from one template in a module on another template in the same module
          .filter(function(dependency) {
            return dependency.SourceHierarchyModel.ModuleID != dependency.TargetHierarchyModel.ModuleID;  
          });

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

            // create the dependency model if it doesn't already exist
            var dependencyModelCacheKey = `"${layer.RootJsonItem.ID}"->"${dependency.TargetHierarchyModel.LayerID}"`;
            var dependencyModel = createdDependencyModelCache[dependencyModelCacheKey]; 
            if (!dependencyModel) {
              dependencyModel = _createDependencyRelationshipModel(
                layer.RootModel,
                targetView.model);
              createdDependencyModelCache[dependencyModelCacheKey] = dependencyModel;
            } 

            // add the dependency view to the diagram
            dependencyView = _createDependencyRelationshipView(
              dependencyModel, 
              layerRootView, 
              targetView, 
              layerDiagram, 
              canvas,
              dependency.IsValid ? undefined : "#ff0000"); 
            
            // add the view to the cache
            createdLayerDependencyViewsCache[targetModel._id] = dependencyView;
            
            // update the documentation for the dependency
            if (dependency.ValidationMessage) {
              documentationEntry = dependency.ValidationMessage + "  \n\n";
            }
            dependencyModel.documentation = documentationEntry;
          } else {
            // the dependency has already been drawn so update the documentation entry
            dependencyView.model.documentation += "  \n" + documentationEntry;
          }
        });
      });
    });

    // layout the layer diagram
    layerDiagram.layout(layoutOptions.TemplatesDiagram); // TODO: move this to separate option


    // LAYER DEPENDENTS DIAGRAM

    // create a cache to hold created views for the layer diagram
    var createdLayerItemViewsCache = {};

    // create a cache to hold the created dependent views for the layer diagram
    var createdLayerDependentsViewsCache = {};

    // create the class diagram for the layer
    var layerDependentsDiagram = new type.UMLClassDiagram();
    layerDependentsDiagram._type = "UMLClassDiagram";
    layerDependentsDiagram._parent = layer.RootModel;
    layerDependentsDiagram.name = `${layer.RootJsonItem.Name} Dependents Diagram`;
    layer.RootModel.ownedElements.push(layerDependentsDiagram);

    // add the view for the layer root package to the diagram
    var layerRootView = _createFolderView(
      layer.RootModel,
      layerDependentsDiagram,
      canvas,
      createdLayerItemViewsCache);

    // loop through the layer's modules and add their dependents to the diagram
    layer.Modules.forEach(function(helixModule) {
      // loop though the module's templates and add the dependents for each to the diagram
      helixModule.JsonTemplates.forEach(function(jsonTemplate) {
        // get the dependents for the template from the cache
        var dependents = templateDependentsCache[jsonTemplate.ID]
          // this is the layer dependents diagram, so we don't show dependents from one template in a module on another template in the same module
          .filter(function(dependent) {
            return dependent.SourceHierarchyModel.ModuleID != dependent.TargetHierarchyModel.ModuleID;  
          });

        // loop through the template's dependents and add each (if not already added) to the diagram
        dependents.forEach(function (dependent) {
          // if the dependent's layer is not on the diagram then add it
          var sourceView = createdLayerItemViewsCache[dependent.SourceHierarchyModel.LayerID];
          var sourceModel;
          var mustCreateDependency = false;
          if (!sourceView) {
            // get the source layer's model
            sourceModel = __getLayerByID(dependent.SourceHierarchyModel.LayerID).RootModel;

            // add the source layer to the diagram
            sourceView = _createFolderView(
              sourceModel,
              layerDependentsDiagram,
              canvas,
              createdLayerItemViewsCache);

            // layer was drawn for first time so definitely need to create the dependent
            mustCreateDependency = true;
          } else {
            sourceModel = sourceView.model;
          }

          // if the dependency view has to be created or if it hasn't yet been drawn (should be true for new deps and those that point at the source layer)
          var dependencyView = createdLayerDependentsViewsCache[dependent.SourceHierarchyModel.LayerID];
          if (mustCreateDependency || !dependencyView) {   
            // create the dependency model if it doesn't already exist
            var dependencyModelCacheKey = `"${dependent.SourceHierarchyModel.LayerID}"->"${layer.RootJsonItem.ID}"`;
            var dependencyModel = createdDependencyModelCache[dependencyModelCacheKey];
            if (!dependencyModel) {
              dependencyModel = _createDependencyRelationshipModel(
                sourceView.model,
                layer.RootModel);
              createdDependencyModelCache[dependencyModelCacheKey] = dependencyModel;
            } 

            // add the dependency view to the diagram
            dependencyView = _createDependencyRelationshipView(
              dependencyModel,  
              sourceView, 
              layerRootView,
              layerDependentsDiagram, 
              canvas, 
              dependent.IsValid ? undefined : "#ff0000"); 
            
            // add the view to the cache
            createdLayerDependentsViewsCache[dependent.SourceHierarchyModel.LayerID] = dependencyView;
          } 
        });
      });
    });

    // layout the layer diagram
    layerDependentsDiagram.layout(layoutOptions.TemplatesDiagram); // TODO: move this to separate option
  };

  __createDiagramsForLayer(helixArchitecture.FoundationLayer);
  __createDiagramsForLayer(helixArchitecture.FeatureLayer);
  __createDiagramsForLayer(helixArchitecture.ProjectLayer);

  // create solution statistics
  var __createLayerStatistics = function(layer) {
    return new Documentation_Types.HelixLayerStatistics(
      layer.ID,
      layer.Modules.map(function(helixModule) {
        return new Documentation_Types.HelixModuleStatistics(
          helixModule.RootJsonItem.ID,
          helixModule.JsonTemplates.length,
          helixModule.JsonTemplates.reduce(function(accumulator, jsonTemplate) { 
            // get dependencies excluding those within the same module
            var dependencies = templateDependenciesCache[jsonTemplate.ID]
              .filter(function(dependency) { return dependency.SourceHierarchyModel.ModuleID != dependency.TargetHierarchyModel.ModuleID });
            return accumulator + dependencies.length;
          }, 0),
          helixModule.JsonTemplates.reduce(function(accumulator, jsonTemplate) {
            // get dependents excluding those within the same module
            var dependents = templateDependentsCache[jsonTemplate.ID]
              .filter(function(dependent) { return dependent.SourceHierarchyModel.ModuleID != dependent.TargetHierarchyModel.ModuleID });
            return accumulator + dependents.length;
          }, 0)
        );
      })
    );
  };

  metaball.SolutionStatistics = new Documentation_Types.SolutionStatistics(new Documentation_Types.HelixStatistics(
    __createLayerStatistics(helixArchitecture.FoundationLayer),
    __createLayerStatistics(helixArchitecture.FeatureLayer),
    __createLayerStatistics(helixArchitecture.ProjectLayer)
  ));

  
  // update the documentation for the layer and module models to include the layer and module statistics
  var __updateStatisticsDocumentationForLayer = function(layer) {
    var layerModelDocumentation = layer.RootModel.documentation;
    if (layerModelDocumentation) {
      layerModelDocumentation += "  \n  \n";
    }
    var layerStats = metaball.SolutionStatistics.HelixStatistics.IDsToLayersMap[layer.ID];
    layerModelDocumentation += `**Total Templates:** ${layerStats.getTotalTemplates()}  \n**Total Modules:** ${layerStats.getTotalModules()}  \n**Total Module Dependencies:** ${layerStats.getTotalModuleDependencies()}  \n**Total Module Dependents:** ${layerStats.getTotalModuleDependents()}`;
    layer.RootModel.documentation = layerModelDocumentation;

    layer.Modules.forEach(function(helixModule) {
      var moduleModelDocumentation = helixModule.RootModel.documentation;
      if (moduleModelDocumentation) {
        moduleModelDocumentation += "  \n  \n";
      }
      var moduleStats = metaball.SolutionStatistics.HelixStatistics.IDsToModulesMap[helixModule.RootJsonItem.ID];
      moduleModelDocumentation += `**Total Templates:** ${moduleStats.TotalTemplates}  \n**Total Dependencies:** ${moduleStats.TotalDependencies}  \n**Total Dependents:** ${moduleStats.TotalDependents}`;
      helixModule.RootModel.documentation = moduleModelDocumentation;
    });
  };

  __updateStatisticsDocumentationForLayer(helixArchitecture.FoundationLayer);
  __updateStatisticsDocumentationForLayer(helixArchitecture.FeatureLayer);
  __updateStatisticsDocumentationForLayer(helixArchitecture.ProjectLayer);
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
 * Reverse engineers the mdj file for the given database and returns the local path to the resulting file
 * @param {Sitecore_Types.Database} database the database to generate the mdj file for
 * @param {String} outputFilePath the path to the output file
 * @param {Documentation_Types.Metaball} metaball holds the metadata for the generation report
 * @param {Documentation_Types.HelixDatabaseMap} helixDatabaseMap holds the helix structure information for the architecture
 * @param {LayoutOptions} layoutOptions (Optional) the formatting options for the diagrams (Default: LayoutOptions defaults)
 * @param {Canvas} canvas (Optional) the canvas on which to draw/size the views
 * @returns {String}
 */
var reverseEngineerMetaDataJsonFile = (database, outputFilePath, metaball, helixDatabaseMap, layoutOptions, canvas) => {
  /* 0) ASSERT AND FORMAT ARGUMENTS */ 

  // database is required and must have an initialized ItemTree property
  if (!database || !database.ItemTree) {
    throw "The ItemTree for the Database is required.";
  }

  // outputFilePath is required
  if (!outputFilePath) {
    throw "The output file path is required";
  }

  // metaball is required
  if (!metaball) {
    throw "The metaball is required";
  }

  // merge the user specified layout options with the defaults
  layoutOptions = extend(new LayoutOptions(), layoutOptions);

  // make the canvas fallback to a new canvas with default values
  canvas = canvas || createCanvas();

  /* 1) CREATE BASIC ENTITIES: PROJECT, ROOT MODEL, TEMPLATES DIAGRAM, AND CLASS DIAGRAMS */

  // create the projet
  var project = new type.Project();
  project._type = "Project";
  project.name = metaball.DocumentationTitle 
    ? metaball.DocumentationTitle
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

  // create the map objects to use for storing the mappings from the created items' IDs to their models/views and item IDs to JSON items
  var createdItemViewsCache = {};
  var jsonItemIDsCache = {};
  var createdInheritanceModelsCache = {};

  // ItemTree is a map of ID->Items for the serialized root items of the database
  var itemTreeRoots = Object.values(database.ItemTree);

  // creates the folder, template and field models and views
  itemTreeRoots.forEach(function (jsonItem) {
    if (jsonItem instanceof Sitecore_Types.Template || jsonItem instanceof Sitecore_Types.TemplateFolder) {
      _createItemModelAndView(jsonItem, rootModel, templatesDiagram, templateFoldersDiagram, canvas, createdItemViewsCache);
    }
  });

  /* 3) CREATE ALL OF THE ITEM RELATIONSHIP MODELS AND VIEWS */

  var totalTemplates = 0;
  var totalTemplateFolders = 0;
  var totalTemplateFields = 0;
  var totalTemplateInheritance = 0;

  // get all the json items in a flat array and then create the relationships for the items
  // *** this needs to run in a separate loop to ensure all items have already been created
  var allItems = itemTreeRoots
    .map(_getJsonItems)
    .reduce(function (result, entry) { return result.concat(entry); }, []);
  
  allItems.forEach(function (jsonItem) {
    jsonItemIDsCache[jsonItem.ID] = jsonItem;
    
    var view = createdItemViewsCache[jsonItem.ID];

    // create the base template relationship models and views
    if (jsonItem instanceof Sitecore_Types.Template) {
      totalTemplates++;
      totalTemplateFields += jsonItem.getFields().length;
      totalTemplateInheritance += jsonItem.BaseTemplates.length;

      // if the base template view doesn't exist then it was never received (should've been filtered out upstream, but just in case)
      jsonItem.BaseTemplates = jsonItem.BaseTemplates.filter(function(jsonBaseTemplateId) {
        return createdItemViewsCache[jsonBaseTemplateId];
      });

      jsonItem.BaseTemplates.forEach(function (jsonBaseTemplateId) {
        var baseTemplateView = createdItemViewsCache[jsonBaseTemplateId];

        // this is the first time looking at the base templates of the items and base templates can't be repeated so we know we need to do this every time
        var modelCacheKey = `"${jsonItem.ID}"->"${jsonBaseTemplateId}"`;
        
        var model = _createBaseTemplateRelationshipModel(view.model, baseTemplateView.model);
        createdInheritanceModelsCache[modelCacheKey] = model;

        _createBaseTemplateRelationshipView(model, view, baseTemplateView, templatesDiagram, canvas);
      });
      // create the parent-child relationship views
    } else {
      totalTemplateFolders++;

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
  if (helixDatabaseMap) {
    _generateHelixDiagrams(
      metaball,
      helixDatabaseMap,
      canvas, 
      createdItemViewsCache, 
      jsonItemIDsCache,
      createdInheritanceModelsCache,
      layoutOptions);
  }
    
  // update the solution statistics
  if (!metaball.SolutionStatistics) {
    metaball.SolutionStatistics = new Documentation_Types.SolutionStatistics();    
  }

  metaball.SolutionStatistics.TotalTemplates = totalTemplates;
  metaball.SolutionStatistics.TotalTemplateFields = totalTemplateFields;
  metaball.SolutionStatistics.TotalTemplateInheritance = totalTemplateInheritance;
  metaball.SolutionStatistics.TotalTemplateFolders = totalTemplateFolders;

  // add the solution statistics to the project model
  var documentation = project.documentation;
  if (documentation) {
    documentation += "  \n  \n";
  }
  documentation += `**Total Templates:** ${totalTemplates}  \n**Total Template Fields:** ${totalTemplateFields}  \n**Total Template Inheritance Relationships:** ${totalTemplateInheritance}  \n**Total Template Folders:** ${totalTemplateFolders}`;
  var helixStats = metaball.SolutionStatistics.HelixStatistics;
  documentation = helixStats
    ? documentation + `  \n  \n**Total Helix Templates:** ${helixStats.getTotalTemplates()}  \n**Total Helix Modules:** ${helixStats.getTotalModules()}  \n**Total Helix Module Dependencies:** ${helixStats.getTotalModuleDependencies()}  \n  \n**Foundation Layer Templates:** ${helixStats.FoundationLayer.getTotalTemplates()}  \n**Foundation Layer Modules:** ${helixStats.FoundationLayer.getTotalModules()}  \n**Foundation Layer Module Dependencies:** ${helixStats.FoundationLayer.getTotalModuleDependencies()}  \n**Foundation Layer Module Dependents:** ${helixStats.FoundationLayer.getTotalModuleDependents()}  \n  \n**Feature Layer Templates:** ${helixStats.FeatureLayer.getTotalTemplates()}  \n**Feature Layer Modules:** ${helixStats.FeatureLayer.getTotalModules()}  \n**Feature Layer Module Dependencies:** ${helixStats.FeatureLayer.getTotalModuleDependencies()}  \n**Feature Layer Module Dependents:** ${helixStats.FeatureLayer.getTotalModuleDependents()}  \n  \n**Project Layer Templates:** ${helixStats.ProjectLayer.getTotalTemplates()}  \n**Project Layer Modules:** ${helixStats.ProjectLayer.getTotalModules()}  \n**Project Layer Module Dependencies:** ${helixStats.ProjectLayer.getTotalModuleDependencies()}  \n**Project Layer Module Dependents:** ${helixStats.ProjectLayer.getTotalModuleDependents()}`
    : documentation;
  project.documentation = documentation;

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