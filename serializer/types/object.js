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
 * ENUMS
 */

/**
 * @summary Type names of Sitecore object types
 */
const TypeNames = {
    Entity: "Entity"
};


/**
 * TYPES
 */

/**
 * @summary An object entity representation
 * @param {string} type the type name of the entity
 */
function Entity(type) {
    /**
     * @property holds the type name of the entity
     */
    this.Type = type || TypeNames.Entity; 
};


/**
 * EXPORTS
 */

exports.Entity = Entity;

exports.TypeNames = TypeNames;
