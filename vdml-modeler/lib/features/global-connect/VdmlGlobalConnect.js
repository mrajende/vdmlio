'use strict';

var isAny = require('../modeling/util/ModelingUtil').isAny;

/**
 * Extention of GlobalConnect tool that implements VDML specific rules about
 * connection start elements.
 */
function VdmlGlobalConnect(globalConnect) {
  globalConnect.registerProvider(this);
}

VdmlGlobalConnect.$inject = [ 'globalConnect' ];

module.exports = VdmlGlobalConnect;


/**
 * Checks if given element can be used for starting connection.
 *
 * @param  {Element} source
 * @return {Boolean}
 */
VdmlGlobalConnect.prototype.canStartConnect = function(source) {

  if (nonExistantOrLabel(source)) {
    return null;
  }

  var businessObject = source.businessObject;

  return isAny(businessObject, [
    'vdml:FlowNode',
    'vdml:InteractionNode',
    'vdml:DataObjectReference',
    'vdml:DataStoreReference'
  ]);
};


function nonExistantOrLabel(element) {
  return !element || isLabel(element);
}

function isLabel(element) {
  return element.labelTarget;
}


