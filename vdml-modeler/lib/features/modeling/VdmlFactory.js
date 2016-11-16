'use strict';

var map = require('lodash/collection/map'),
    assign = require('lodash/object/assign'),
    pick = require('lodash/object/pick');


function VdmlFactory(moddle) {
  this._model = moddle;
}

VdmlFactory.$inject = [ 'moddle' ];


VdmlFactory.prototype._needsId = function(element) {
  return element.$instanceOf('vdml:RootElement') ||
         element.$instanceOf('vdml:FlowElement') ||
         element.$instanceOf('vdml:MessageFlow') ||
         element.$instanceOf('vdml:DataAssociation') ||
         element.$instanceOf('vdml:Artifact') ||
         element.$instanceOf('vdml:Participant') ||
         element.$instanceOf('vdml:Lane') ||
         element.$instanceOf('vdml:Process') ||
         element.$instanceOf('vdml:Collaboration') ||
         element.$instanceOf('vdmldi:VDMLShape') ||
         element.$instanceOf('vdmldi:VDMLEdge') ||
         element.$instanceOf('vdmldi:VDMLDiagram') ||
         element.$instanceOf('vdmldi:VDMLPlane') ||
         element.$instanceOf('vdml:Property');
};

VdmlFactory.prototype._ensureId = function(element) {

  // generate semantic ids for elements
  // vdml:SequenceFlow -> SequenceFlow_ID
  var prefix = (element.$type || '').replace(/^[^:]*:/g, '') + '_';

  if (!element.id && this._needsId(element)) {
    element.id = this._model.ids.nextPrefixed(prefix, element);
  }
};


VdmlFactory.prototype.create = function(type, attrs) {
  var element = this._model.create(type, attrs || {});

  this._ensureId(element);

  return element;
};


VdmlFactory.prototype.createDiLabel = function() {
  return this.create('vdmldi:VDMLLabel', {
    bounds: this.createDiBounds()
  });
};


VdmlFactory.prototype.createDiShape = function(semantic, bounds, attrs) {

  return this.create('vdmldi:VDMLShape', assign({
    vdmlElement: semantic,
    bounds: this.createDiBounds(bounds)
  }, attrs));
};


VdmlFactory.prototype.createDiBounds = function(bounds) {
  return this.create('dc:Bounds', bounds);
};


VdmlFactory.prototype.createDiWaypoints = function (waypoints, isCurved) {
    return map(waypoints, function (pos) {
        return this.createDiWaypoint(pos);
    }, this);
};

VdmlFactory.prototype.createDiWaypoint = function(point) {
  return this.create('dc:Point', pick(point, [ 'x', 'y' ]));
};


VdmlFactory.prototype.createDiEdge = function(semantic, waypoints, attrs) {
  return this.create('vdmldi:VDMLEdge', assign({
    vdmlElement: semantic
  }, attrs));
};

VdmlFactory.prototype.createDiPlane = function(semantic) {
  return this.create('vdmldi:VDMLPlane', {
    vdmlElement: semantic
  });
};

module.exports = VdmlFactory;
