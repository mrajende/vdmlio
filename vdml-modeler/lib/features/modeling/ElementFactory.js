'use strict';

var assign = require('lodash/object/assign'),
    inherits = require('inherits');

var is = require('../../util/ModelUtil').is;

var isExpanded = require('../../util/DiUtil').isExpanded;

var BaseElementFactory = require('diagram-js/lib/core/ElementFactory'),
    LabelUtil = require('../../util/LabelUtil');

/**
 * A vdml-aware factory for diagram-js shapes
 */
function ElementFactory(vdmlFactory, moddle, translate) {
  BaseElementFactory.call(this);

  this._vdmlFactory = vdmlFactory;
  this._moddle = moddle;
  this._translate = translate;
}

inherits(ElementFactory, BaseElementFactory);


ElementFactory.$inject = [ 'vdmlFactory', 'moddle', 'translate' ];

module.exports = ElementFactory;

ElementFactory.prototype.baseCreate = BaseElementFactory.prototype.create;

ElementFactory.prototype.create = function(elementType, attrs) {
  // no special magic for labels,
  // we assume their businessObjects have already been created
  // and wired via attrs
  if (elementType === 'label') {
    return this.baseCreate(elementType, assign({ type: 'label' }, LabelUtil.DEFAULT_LABEL_SIZE, attrs));
  }

  return this.createVdmlElement(elementType, attrs);
};

ElementFactory.prototype.createVdmlElement = function(elementType, attrs) {
  var size,
      translate = this._translate;

  attrs = attrs || {};

  var businessObject = attrs.businessObject;

  if (!businessObject) {
    if (!attrs.type) {
      throw new Error(translate('no shape type specified'));
    }

    businessObject = this._vdmlFactory.create(attrs.type);
  }

  if (!businessObject.di) {
    if (elementType === 'root') {
      businessObject.di = this._vdmlFactory.createDiPlane(businessObject, [], {
        id: businessObject.id + '_di'
      });
    } else
    if (elementType === 'connection') {
      businessObject.di = this._vdmlFactory.createDiEdge(businessObject, [], {
        id: businessObject.id + '_di'
      });
    } else {
      businessObject.di = this._vdmlFactory.createDiShape(businessObject, {}, {
        id: businessObject.id + '_di'
      });
    }
  }

  if (attrs.processRef) {
    businessObject.processRef = attrs.processRef;
  }

  if (attrs.isExpanded) {
    businessObject.di.isExpanded = attrs.isExpanded;
  }

  if (is(businessObject, 'vdml:ExclusiveGateway')) {
    businessObject.di.isMarkerVisible = true;
  }

  if (attrs.isInterrupting === false) {
    businessObject.isInterrupting = false;
  }

  if (attrs.associationDirection) {
    businessObject.associationDirection = attrs.associationDirection;
  }

  var eventDefinitions,
      newEventDefinition;

  if (attrs.eventDefinitionType) {
    eventDefinitions = businessObject.get('eventDefinitions') || [];
    newEventDefinition = this._moddle.create(attrs.eventDefinitionType);

    eventDefinitions.push(newEventDefinition);

    newEventDefinition.$parent = businessObject;
    businessObject.eventDefinitions = eventDefinitions;
  }

  if (attrs.isForCompensation) {
    businessObject.isForCompensation = true;
  }

  size = this._getDefaultSize(businessObject);

  attrs = assign({
    businessObject: businessObject,
    id: businessObject.id
  }, size, attrs);

  return this.baseCreate(elementType, attrs);
};


ElementFactory.prototype._getDefaultSize = function(semantic) {
    if (is(semantic, 'vdml:BusinessModel') || is(semantic, 'vdml:Role')) {
        return { width: 50, height: 50 };
  }
  if (is(semantic, 'vdml:Participant')) {
     return { width: 100, height: 36 };
  }

  if (is(semantic, 'vdml:Lane')) {
    return { width: 400, height: 100 };
  }

  if (is(semantic, 'vdml:TextAnnotation')) {
    return { width: 100, height: 30 };
  }

  return { width: 100, height: 36 };
};


ElementFactory.prototype.createParticipantShape = function(collapsed) {

  var attrs = { type: 'vdml:Participant' };

  if (!collapsed) {
    attrs.processRef = this._vdmlFactory.create('vdml:Process');
  }

  return this.createShape(attrs);
};
