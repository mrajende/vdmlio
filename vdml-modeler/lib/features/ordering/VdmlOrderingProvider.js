'use strict';

var inherits = require('inherits');

var OrderingProvider = require('diagram-js/lib/features/ordering/OrderingProvider');

var isAny = require('../modeling/util/ModelingUtil').isAny;

var findIndex = require('lodash/array/findIndex');

var find = require('lodash/collection/find');


/**
 * a simple ordering provider that makes sure:
 *
 * (1) elements are ordered by a {level} property
 * (2) elements with {alwaysOnTop} are always added to the root
 */
function VdmlOrderingProvider(eventBus, translate) {

  OrderingProvider.call(this, eventBus);

  var orders = [
    { type: 'vdml:SubProcess', order: { level: 6 } },
    {
      type: 'vdml:SequenceFlow',
      order: {
        level: 5,
        containers: [
          'vdml:Participant',
          'vdml:FlowElementsContainer'
        ]
      }
    },
    { type: 'vdml:DataInputAssociation', order: { level: 9, containers: [ 'vdml:Collaboration', 'vdml:Process' ] } },
    { type: 'vdml:DataOutputAssociation', order: { level: 9, containers: [ 'vdml:Collaboration', 'vdml:Process' ] } },
    { type: 'vdml:MessageFlow', order: { level: 9, containers: [ 'vdml:Collaboration' ] } },
    {
      type: 'vdml:Association',
      order: {
        level: 6,
        containers: [
          'vdml:Participant',
          'vdml:FlowElementsContainer',
          'vdml:Collaboration'
        ]
      }
    },
    { type: 'vdml:BoundaryEvent', order: { level: 8 } },
    { type: 'vdml:Participant', order: { level: -2 } },
    { type: 'vdml:Lane', order: { level: -1 } }
  ];

  function computeOrder(element) {
    if (element.labelTarget) {
      return { level: 10 };
    }

    var entry = find(orders, function(o) {
      return isAny(element, [ o.type ]);
    });

    return entry && entry.order || { level: 1 };
  }

  function getOrder(element) {

    var order = element.order;

    if (!order) {
      element.order = order = computeOrder(element);
    }

    return order;
  }

  function findActualParent(element, newParent, containers) {

    var actualParent = newParent;

    while (actualParent) {

      if (isAny(actualParent, containers)) {
        break;
      }

      actualParent = actualParent.parent;
    }

    if (!actualParent) {
      throw new Error(translate('no parent for {element} in {parent}', {
        element: element.id,
        parent: newParent.id
      }));
    }

    return actualParent;
  }

  this.getOrdering = function(element, newParent) {

    var elementOrder = getOrder(element);


    if (elementOrder.containers) {
      newParent = findActualParent(element, newParent, elementOrder.containers);
    }


    var currentIndex = newParent.children.indexOf(element);

    var insertIndex = findIndex(newParent.children, function(child) {

      // do not compare with labels, they are created
      // in the wrong order (right after elements) during import and
      // mess up the positioning.
      if (!element.labelTarget && child.labelTarget) {
        return false;
      }

      return elementOrder.level < getOrder(child).level;
    });


    // if the element is already in the child list at
    // a smaller index, we need to adjust the inser index.
    // this takes into account that the element is being removed
    // before being re-inserted
    if (insertIndex !== -1) {
      if (currentIndex !== -1 && currentIndex < insertIndex) {
        insertIndex -= 1;
      }
    }

    return {
      index: insertIndex,
      parent: newParent
    };
  };
}

VdmlOrderingProvider.$inject = [ 'eventBus', 'translate' ];

inherits(VdmlOrderingProvider, OrderingProvider);

module.exports = VdmlOrderingProvider;
