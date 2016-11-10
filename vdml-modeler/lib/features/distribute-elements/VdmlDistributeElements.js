'use strict';

var filter = require('lodash/collection/filter');

var isAny = require('../modeling/util/ModelingUtil').isAny;

/**
 * Registers element exclude filters for elements that currently do 
 * not support distribution.
 */
function VdmlDistributeElements(distributeElements) {

  distributeElements.registerFilter(function(elements) {
    return filter(elements, function(element) {
      var cannotDistribute = isAny(element, [
        'vdml:Association',
        'vdml:BoundaryEvent',
        'vdml:DataInputAssociation',
        'vdml:DataOutputAssociation',
        'vdml:Lane',
        'vdml:MessageFlow',
        'vdml:Participant',
        'vdml:SequenceFlow',
        'vdml:TextAnnotation'
      ]);

      return !(element.labelTarget || cannotDistribute);
    });
  });
}

VdmlDistributeElements.$inject = [ 'distributeElements' ];

module.exports = VdmlDistributeElements;
