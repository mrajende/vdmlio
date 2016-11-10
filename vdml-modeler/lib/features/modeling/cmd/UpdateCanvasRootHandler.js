'use strict';

var Collections = require('diagram-js/lib/util/Collections');


function UpdateCanvasRootHandler(canvas, modeling) {
  this._canvas = canvas;
  this._modeling = modeling;
}

UpdateCanvasRootHandler.$inject = [ 'canvas', 'modeling' ];

module.exports = UpdateCanvasRootHandler;


UpdateCanvasRootHandler.prototype.execute = function(context) {

  var canvas = this._canvas;

  var newRoot = context.newRoot,
      newRootBusinessObject = newRoot.businessObject,
      oldRoot = canvas.getRootElement(),
      oldRootBusinessObject = oldRoot.businessObject,
      vdmlDefinitions = oldRootBusinessObject.$parent,
      diPlane = oldRootBusinessObject.di;

  // (1) replace process old <> new root
  canvas.setRootElement(newRoot, true);

  // (2) update root elements
  Collections.add(vdmlDefinitions.rootElements, newRootBusinessObject);
  newRootBusinessObject.$parent = vdmlDefinitions;

  Collections.remove(vdmlDefinitions.rootElements, oldRootBusinessObject);
  oldRootBusinessObject.$parent = null;

  // (3) wire di
  oldRootBusinessObject.di = null;

  diPlane.vdmlElement = newRootBusinessObject;
  newRootBusinessObject.di = diPlane;

  context.oldRoot = oldRoot;

  // TODO(nikku): return changed elements?
  // return [ newRoot, oldRoot ];
};


UpdateCanvasRootHandler.prototype.revert = function(context) {

  var canvas = this._canvas;

  var newRoot = context.newRoot,
      newRootBusinessObject = newRoot.businessObject,
      oldRoot = context.oldRoot,
      oldRootBusinessObject = oldRoot.businessObject,
      vdmlDefinitions = newRootBusinessObject.$parent,
      diPlane = newRootBusinessObject.di;

  // (1) replace process old <> new root
  canvas.setRootElement(oldRoot, true);

  // (2) update root elements
  Collections.remove(vdmlDefinitions.rootElements, newRootBusinessObject);
  newRootBusinessObject.$parent = null;

  Collections.add(vdmlDefinitions.rootElements, oldRootBusinessObject);
  oldRootBusinessObject.$parent = vdmlDefinitions;

  // (3) wire di
  newRootBusinessObject.di = null;

  diPlane.vdmlElement = oldRootBusinessObject;
  oldRootBusinessObject.di = diPlane;

  // TODO(nikku): return changed elements?
  // return [ newRoot, oldRoot ];
};