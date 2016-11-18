'use strict';

var find = require('lodash/collection/find'),
    any = require('lodash/collection/any'),
    every = require('lodash/collection/every'),
    filter = require('lodash/collection/filter'),
    forEach = require('lodash/collection/forEach'),
    inherits = require('inherits');

var getParents = require('../modeling/util/ModelingUtil').getParents,
    is = require('../../util/ModelUtil').is,
    isAny = require('../modeling/util/ModelingUtil').isAny,
    getBusinessObject = require('../../util/ModelUtil').getBusinessObject,
    isExpanded = require('../../util/DiUtil').isExpanded,
    isEventSubProcess = require('../../util/DiUtil').isEventSubProcess,
    isInterrupting = require('../../util/DiUtil').isInterrupting;


var RuleProvider = require('diagram-js/lib/features/rules/RuleProvider');

var isBoundaryAttachment = require('../snapping/VdmlSnappingUtil').getBoundaryAttachment;

/**
 * VDML specific modeling rule
 */
function VdmlRules(eventBus) {
  RuleProvider.call(this, eventBus);
}

inherits(VdmlRules, RuleProvider);

VdmlRules.$inject = [ 'eventBus' ];

module.exports = VdmlRules;

VdmlRules.prototype.init = function() {

  this.addRule('connection.create', function(context) {
    var source = context.source,
        target = context.target;

    return canConnect(source, target);
  });

  this.addRule('connection.reconnectStart', function(context) {

    var connection = context.connection,
        source = context.hover || context.source,
        target = connection.target;

    return canConnect(source, target, connection);
  });

  this.addRule('connection.reconnectEnd', function(context) {

    var connection = context.connection,
        source = connection.source,
        target = context.hover || context.target;

    return canConnect(source, target, connection);
  });

  this.addRule('connection.updateWaypoints', function(context) {
    // OK! but visually ignore
    return null;
  });

  this.addRule('shape.resize', function(context) {

    var shape = context.shape,
        newBounds = context.newBounds;

    return canResize(shape, newBounds);
  });

  this.addRule('elements.move', function(context) {

    var target = context.target,
        shapes = context.shapes,
        position = context.position;

    return canAttach(shapes, target, null, position) ||
           canReplace(shapes, target, position) ||
           canMove(shapes, target, position);
  });

  this.addRule([ 'shape.create', 'shape.append' ], function(context) {
    var target = context.target,
        shape = context.shape,
        source = context.source,
        position = context.position;

    return canAttach([ shape ], target, source, position) || canCreate(shape, target, source, position);
  });

  this.addRule('element.copy', function(context) {
    var collection = context.collection,
        element = context.element;

    return canCopy(collection, element);
  });

  this.addRule('element.paste', function(context) {
    var parent = context.parent,
        element = context.element,
        position = context.position,
        source = context.source,
        target = context.target;

    if (source || target) {
      return canConnect(source, target);
    }

    return canAttach([ element ], parent, null, position) || canCreate(element, parent, null, position);
  });

  this.addRule('elements.paste', function(context) {
    var tree = context.tree,
        target = context.target;

    return canPaste(tree, target);
  });

  this.addRule([ 'elements.delete' ], function(context) {

    // do not allow deletion of labels
    return filter(context.elements, function(e) {
      return !isLabel(e);
    });
  });
};

VdmlRules.prototype.canConnectMessageFlow = canConnectMessageFlow;

VdmlRules.prototype.canConnectSequenceFlow = canConnectSequenceFlow;

VdmlRules.prototype.canConnectDataAssociation = canConnectDataAssociation;

VdmlRules.prototype.canConnectAssociation = canConnectAssociation;

VdmlRules.prototype.canMove = canMove;

VdmlRules.prototype.canAttach = canAttach;

VdmlRules.prototype.canReplace = canReplace;

VdmlRules.prototype.canDrop = canDrop;

VdmlRules.prototype.canInsert = canInsert;

VdmlRules.prototype.canCreate = canCreate;

VdmlRules.prototype.canConnect = canConnect;

VdmlRules.prototype.canResize = canResize;

VdmlRules.prototype.canCopy = canCopy;

/**
 * Utility functions for rule checking
 */

function nonExistantOrLabel(element) {
  return !element || isLabel(element);
}

function isSame(a, b) {
  return a === b;
}

function getOrganizationalParent(element) {

  var bo = getBusinessObject(element);

  while (bo && !is(bo, 'vdml:Process')) {
    if (is(bo, 'vdml:Participant')) {
      return bo.processRef || bo;
    }

    bo = bo.$parent;
  }

  return bo;
}

function isTextAnnotation(element) {
  return is(element, 'vdml:TextAnnotation');
}

function isCompensationBoundary(element) {
  return is(element, 'vdml:BoundaryEvent') &&
         hasEventDefinition(element, 'vdml:CompensateEventDefinition');
}

function isForCompensation(e) {
  return getBusinessObject(e).isForCompensation;
}

function isSameOrganization(a, b) {
  var parentA = getOrganizationalParent(a),
      parentB = getOrganizationalParent(b);

  return parentA === parentB;
}

function isMessageFlowSource(element) {
  return is(element, 'vdml:InteractionNode') &&
        !isForCompensation(element) && (
            !is(element, 'vdml:Event') || (
              is(element, 'vdml:ThrowEvent') &&
              hasEventDefinitionOrNone(element, 'vdml:MessageEventDefinition')
            )
  );
}

function isMessageFlowTarget(element) {
  return is(element, 'vdml:InteractionNode') &&
        !isForCompensation(element) && (
            !is(element, 'vdml:Event') || (
              is(element, 'vdml:CatchEvent') &&
              hasEventDefinitionOrNone(element, 'vdml:MessageEventDefinition')
            )
  );
}

function getScopeParent(element) {

  var bo = getBusinessObject(element);

  if (is(bo, 'vdml:Participant')) {
    return null;
  }

  while (bo) {
    bo = bo.$parent;

    if (is(bo, 'vdml:FlowElementsContainer')) {
      return bo;
    }
  }

  return bo;
}

function isSameScope(a, b) {
  var scopeParentA = getScopeParent(a),
      scopeParentB = getScopeParent(b);

  return scopeParentA && (scopeParentA === scopeParentB);
}

function hasEventDefinition(element, eventDefinition) {
  var bo = getBusinessObject(element);

  return !!find(bo.eventDefinitions || [], function(definition) {
    return is(definition, eventDefinition);
  });
}

function hasEventDefinitionOrNone(element, eventDefinition) {
  var bo = getBusinessObject(element);

  return (bo.eventDefinitions || []).every(function(definition) {
    return is(definition, eventDefinition);
  });
}

function isSequenceFlowSource(element) {
  return is(element, 'vdml:FlowNode') &&
        !is(element, 'vdml:EndEvent') &&
        !isEventSubProcess(element) &&
        !(is(element, 'vdml:IntermediateThrowEvent') &&
          hasEventDefinition(element, 'vdml:LinkEventDefinition')
        ) &&
        !isCompensationBoundary(element) &&
        !isForCompensation(element);
}

function isSequenceFlowTarget(element) {
  return is(element, 'vdml:FlowNode') &&
        !is(element, 'vdml:StartEvent') &&
        !is(element, 'vdml:BoundaryEvent') &&
        !isEventSubProcess(element) &&
        !(is(element, 'vdml:IntermediateCatchEvent') &&
          hasEventDefinition(element, 'vdml:LinkEventDefinition')
        ) &&
        !isForCompensation(element);

}

function isEventBasedTarget(element) {
  return is(element, 'vdml:ReceiveTask') || (
         is(element, 'vdml:IntermediateCatchEvent') && (
           hasEventDefinition(element, 'vdml:MessageEventDefinition') ||
           hasEventDefinition(element, 'vdml:TimerEventDefinition') ||
           hasEventDefinition(element, 'vdml:ConditionalEventDefinition') ||
           hasEventDefinition(element, 'vdml:SignalEventDefinition')
         )
  );
}

function isLabel(element) {
  return element.labelTarget;
}

function isConnection(element) {
  return element.waypoints;
}

function isParent(possibleParent, element) {
  var allParents = getParents(element);
  return allParents.indexOf(possibleParent) !== -1;
}

function canConnect(source, target, connection) {
  

  if (nonExistantOrLabel(source) || nonExistantOrLabel(target)) {
    return null;
  }

  // See https://github.com/vdml-io/vdml-js/issues/178
  // as a workround we disallow connections with same
  // target and source element.
  // This rule must be removed if a auto layout for this
  // connections is implemented.
  if (isSame(source, target)) {
    return false;
  }
  if (!is(connection, 'vdml:DataAssociation')) {
      if (canConnectSequenceFlow(source, target)) {
          return { type: 'vdml:ValueProposition' };
      }
    if (canConnectMessageFlow(source, target)) {
      return { type: 'vdml:MessageFlow' };
    }
  }

  var connectDataAssociation = canConnectDataAssociation(source, target);

  if (connectDataAssociation) {
    return connectDataAssociation;
  }

  if (isCompensationBoundary(source) && isForCompensation(target)) {
    return {
      type: 'vdml:Association',
      associationDirection: 'One'
    };
  }

  if (is(connection, 'vdml:Association') && canConnectAssociation(source, target)) {

    return {
      type: 'vdml:Association'
    };
  }

  if (isTextAnnotation(source) || isTextAnnotation(target)) {

    return {
      type: 'vdml:Association'
    };
  }

  return false;
}

/**
 * Can an element be dropped into the target element
 *
 * @return {Boolean}
 */
function canDrop(element, target, position) {

  // can move labels everywhere
  if (isLabel(element) && !isConnection(target)) {
    return true;
  }

  // disallow to create elements on collapsed pools
  if (is(target, 'vdml:Participant') && !isExpanded(target)) {
    return false;
  }

  // allow to create new participants on
  // on existing collaboration and process diagrams
  if (is(element, 'vdml:Participant')) {
    return is(target, 'vdml:EcoMap');
  }

  // allow creating lanes on participants and other lanes only
  if (is(element, 'vdml:Lane')) {
    return is(target, 'vdml:Participant') || is(target, 'vdml:Lane');
  }

  if (is(element, 'vdml:BoundaryEvent')) {
    return false;
  }

  // drop flow elements onto flow element containers
  // and participants
  if (is(element, 'vdml:FlowElement') || is(element, 'vdml:DataAssociation')) {
    if (is(target, 'vdml:FlowElementsContainer')) {
      return isExpanded(target);
    }

    return isAny(target, [ 'vdml:Participant', 'vdml:Lane' ]);
  }

  if (is(element, 'vdml:Artifact')) {
    return isAny(target, [
      'vdml:Collaboration',
      'vdml:Lane',
      'vdml:Participant',
      'vdml:Process',
      'vdml:SubProcess' ]);
  }

  if (is(element, 'vdml:MessageFlow')) {
    return is(target, 'vdml:Collaboration')
      || element.source.parent == target
      || element.target.parent == target;
  }

  return false;
}

function canPaste(tree, target) {
  var topLevel = tree[0],
      participants;

  if (is(target, 'vdml:Collaboration')) {
    return every(topLevel, function(e) {
      return e.type === 'vdml:Participant';
    });
  }

  if (is(target, 'vdml:Process')) {
    participants = any(topLevel, function(e) {
      return e.type === 'vdml:Participant';
    });

    return !(participants && target.children.length > 0);
  }

  // disallow to create elements on collapsed pools
  if (is(target, 'vdml:Participant') && !isExpanded(target)) {
    return false;
  }

  if (is(target, 'vdml:FlowElementsContainer')) {
    return isExpanded(target);
  }

  return isAny(target, [
    'vdml:Collaboration',
    'vdml:Lane',
    'vdml:Participant',
    'vdml:Process',
    'vdml:SubProcess' ]);
}

function isBoundaryEvent(element) {
  return !isLabel(element) && is(element, 'vdml:BoundaryEvent');
}

function isLane(element) {
  return is(element, 'vdml:Lane');
}

/**
 * We treat IntermediateThrowEvents as boundary events during create,
 * this must be reflected in the rules.
 */
function isBoundaryCandidate(element) {
  return isBoundaryEvent(element) ||
        (is(element, 'vdml:IntermediateThrowEvent') && !element.parent);
}


function canAttach(elements, target, source, position) {

  if (!Array.isArray(elements)) {
    elements = [ elements ];
  }

  // disallow appending as boundary event
  if (source) {
    return false;
  }

  // only (re-)attach one element at a time
  if (elements.length !== 1) {
    return false;
  }

  var element = elements[0];

  // do not attach labels
  if (isLabel(element)) {
    return false;
  }

  // only handle boundary events
  if (!isBoundaryCandidate(element)) {
    return false;
  }

  // allow default move operation
  if (!target) {
    return true;
  }

  // disallow drop on event sub processes
  if (isEventSubProcess(target)) {
    return false;
  }

  // only allow drop on non compensation activities
  if (!is(target, 'vdml:Activity') || isForCompensation(target)) {
    return false;
  }

  // only attach to subprocess border
  if (position && !isBoundaryAttachment(position, target)) {
    return false;
  }

  return 'attach';
}


/**
 * Defines how to replace elements for a given target.
 *
 * Returns an array containing all elements which will be replaced.
 *
 * @example
 *
 *  [{ id: 'IntermediateEvent_2',
 *     type: 'vdml:StartEvent'
 *   },
 *   { id: 'IntermediateEvent_5',
 *     type: 'vdml:EndEvent'
 *   }]
 *
 * @param  {Array} elements
 * @param  {Object} target
 *
 * @return {Object} an object containing all elements which have to be replaced
 */
function canReplace(elements, target, position) {

  if (!target) {
    return false;
  }

  var canExecute = {
    replacements: []
  };

  forEach(elements, function(element) {

    // replace a non-interrupting start event by a blank interrupting start event
    // when the target is not an event sub process
    if (!isEventSubProcess(target)) {

      if (is(element, 'vdml:StartEvent') &&
          !isInterrupting(element) &&
          element.type !== 'label' &&
          canDrop(element, target)) {

        canExecute.replacements.push({
          oldElementId: element.id,
          newElementType: 'vdml:StartEvent'
        });
      }
    }

    if (!is(target, 'vdml:Transaction')) {
      if (hasEventDefinition(element, 'vdml:CancelEventDefinition') &&
          element.type !== 'label') {

        if (is(element, 'vdml:EndEvent') && canDrop(element, target)) {
          canExecute.replacements.push({
            oldElementId: element.id,
            newElementType: 'vdml:EndEvent'
          });
        }

        if (is(element, 'vdml:BoundaryEvent') && canAttach(element, target, null, position)) {
          canExecute.replacements.push({
            oldElementId: element.id,
            newElementType: 'vdml:BoundaryEvent'
          });
        }
      }
    }
  });

  return canExecute.replacements.length ? canExecute : false;
}

function canMove(elements, target) {

  // do not move selection containing boundary events
  if (any(elements, isBoundaryEvent)) {
    return false;
  }

  // do not move selection containing lanes
  if (any(elements, isLane)) {
    return false;
  }

  // allow default move check to start move operation
  if (!target) {
    return true;
  }

  return elements.every(function(element) {
    return canDrop(element, target);
  });
}

function canCreate(shape, target, source, position) {

  if (!target) {
    return false;
  }

  if (isLabel(target)) {
    return null;
  }

  if (isSame(source, target)) {
    return false;
  }

  // ensure we do not drop the element
  // into source
  if (source && isParent(source, target)) {
    return false;
  }

  return canDrop(shape, target, position) || canInsert(shape, target, position);
}

function canResize(shape, newBounds) {
  if (is(shape, 'vdml:SubProcess')) {
    return (!!isExpanded(shape)) && (
          !newBounds || (newBounds.width >= 100 && newBounds.height >= 80)
    );
  }

  if (is(shape, 'vdml:Lane')) {
    return !newBounds || (newBounds.width >= 130 && newBounds.height >= 60);
  }

  if (is(shape, 'vdml:Participant')) {
    return !newBounds || (newBounds.width >= 250 && newBounds.height >= 50);
  }

  if (isTextAnnotation(shape)) {
    return true;
  }

  return false;
}

function canConnectAssociation(source, target) {

  // do not connect connections
  if (isConnection(source) || isConnection(target)) {
    return false;
  }

  // connect if different parent
  return !isParent(target, source) &&
         !isParent(source, target);
}

function canConnectMessageFlow(source, target) {

  return isMessageFlowSource(source) &&
         isMessageFlowTarget(target) ;
}

function canConnectSequenceFlow(source, target) {

  return isSequenceFlowSource(source) &&
         isSequenceFlowTarget(target) ;
}


function canConnectDataAssociation(source, target) {

  if (isAny(source, [ 'vdml:DataObjectReference', 'vdml:DataStoreReference' ]) &&
      isAny(target, [ 'vdml:Activity', 'vdml:ThrowEvent' ])) {
    return { type: 'vdml:DataInputAssociation' };
  }

  if (isAny(target, [ 'vdml:DataObjectReference', 'vdml:DataStoreReference' ]) &&
      isAny(source, [ 'vdml:Activity', 'vdml:CatchEvent' ])) {
    return { type: 'vdml:DataOutputAssociation' };
  }

  return false;
}

function canInsert(shape, flow, position) {

  // return true if we can drop on the
  // underlying flow parent
  //
  // at this point we are not really able to talk
  // about connection rules (yet)
  return (
    isAny(flow, [ 'vdml:SequenceFlow', 'vdml:MessageFlow' ]) &&
    is(shape, 'vdml:FlowNode') &&
    !is(shape, 'vdml:BoundaryEvent') &&
    canDrop(shape, flow.parent, position));
}

function contains(collection, element) {
  return (collection && element) && collection.indexOf(element) !== -1;
}

function canCopy(collection, element) {
  if (is(element, 'vdml:Lane') && !contains(collection, element.parent)) {
    return false;
  }

  if (is(element, 'vdml:BoundaryEvent') && !contains(collection, element.host)) {
    return false;
  }

  return true;
}
