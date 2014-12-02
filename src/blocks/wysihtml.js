"use strict";

/*
 Wysihtml Editor Block
 Make sure you initialize(loaded) following dependencies in your system to make this block work:
 bootstrap, bootstrap3-wysihtml5-bower, fontawesome
 */

var Block = require('../block');
var stToHTML = require('../to-html');
var timeStamp = null;

module.exports = Block.extend({

    type: "wysihtml",

    title: function() { return 'wysihtml'; },

    editorHTML: function() {
        timeStamp = Date.now();
        return '<textarea id="wysihtml-editor-' + timeStamp + '" name="wysihtml" class="st-required st-input-string st-wysihtml-input"></textarea>';
    },

    icon_name: 'text',

    onBlockRender : function () {
        $('#wysihtml-editor-' + timeStamp).wysihtml5();
    },

    loadData: function(data){
        this.$('.jst-wysihtml-input').val(data.wysihtml);
    }
});
