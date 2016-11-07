'use strict';

var is = require('./ModelUtil').is,
    getBusinessObject = require('./ModelUtil').getBusinessObject;

module.exports.isExpanded = function(element) {

  if (is(element, 'vdml:CallActivity')) {
    return false;
  }

  if (is(element, 'vdml:SubProcess')) {
    return !!getBusinessObject(element).di.isExpanded;
  }

  if (is(element, 'vdml:Participant')) {
    return !!getBusinessObject(element).processRef;
  }

  return true;
};

module.exports.isInterrupting = function(element) {
  return element && getBusinessObject(element).isInterrupting !== false;
};

module.exports.isEventSubProcess = function(element) {
  return element && !!getBusinessObject(element).triggeredByEvent;
};
