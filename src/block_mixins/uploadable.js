"use strict";

var _ = require('../lodash');
var config = require('../config');
var utils = require('../utils');

var fileUploader = require('../extensions/sir-trevor.uploader');

module.exports = {

  mixinName: "Uploadable",

  uploadsCount: 0,

  initializeUploadable: function() {
    utils.log("Adding uploadable to block " + this.blockID);
    this.withMixin(require('./ajaxable'));

    this.upload_options = Object.assign({}, config.defaults.Block.upload_options, this.upload_options);
    if (this.$('.upload-area').length !== 0) {
        this.$('.upload-area').append(_.template(this.upload_options.html, this));
    } else {
        this.$inputs.append(_.template(this.upload_options.html, this));
    }
  },

  uploader: function(file, success, failure){
    return fileUploader(this, file, success, failure);
  }

};
