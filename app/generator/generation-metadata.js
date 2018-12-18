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
};


exports.Metaball = Metaball;