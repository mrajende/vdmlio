'use strict';

var is = require('../../util/ModelUtil').is;

function getLabelAttr(semantic) {
  if (is(semantic, 'vdml:FlowElement') ||
      is(semantic, 'vdml:Participant') ||
      is(semantic, 'vdml:Lane') ||
      is(semantic, 'vdml:SequenceFlow') ||
      is(semantic, 'vdml:MessageFlow')) {

    return 'name';
  }

  if (is(semantic, 'vdml:TextAnnotation')) {
    return 'text';
  }
}

module.exports.getLabel = function(element) {
  var semantic = element.businessObject,
      attr = getLabelAttr(semantic);

  if (attr) {
    return semantic[attr] || '';
  }
};


module.exports.setLabel = function(element, text, isExternal) {
  var semantic = element.businessObject,
      attr = getLabelAttr(semantic);

  if (attr) {
    semantic[attr] = text;
  }

  // show external label if not empty
  if (isExternal) {
    element.hidden = !text;
  }

  return element;
};