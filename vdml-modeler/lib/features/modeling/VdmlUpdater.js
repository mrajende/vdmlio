'use strict';

var assign = require('lodash/object/assign'),
    forEach = require('lodash/collection/forEach'),
    inherits = require('inherits');

var Collections = require('diagram-js/lib/util/Collections'),
    Model = require('diagram-js/lib/model');

var getBusinessObject = require('../../util/ModelUtil').getBusinessObject,
    is = require('../../util/ModelUtil').is;

var CommandInterceptor = require('diagram-js/lib/command/CommandInterceptor');

/**
 * A handler responsible for updating the underlying VDML 2.0 XML + DI
 * once changes on the diagram happen
 */
function VdmlUpdater(eventBus, vdmlFactory, connectionDocking, translate) {

  CommandInterceptor.call(this, eventBus);

  this._vdmlFactory = vdmlFactory;
  this._translate = translate;

  var self = this;



  ////// connection cropping /////////////////////////

  // crop connection ends during create/update
  function cropConnection(e) {
    var context = e.context,
        connection;

    if (!context.cropped) {
      connection = context.connection;
      connection.waypoints = connectionDocking.getCroppedWaypoints(connection);
      context.cropped = true;
    }
  }

  this.executed([
    'connection.layout',
    'connection.create',
    'connection.reconnectEnd',
    'connection.reconnectStart'
  ], cropConnection);

  this.reverted([ 'connection.layout' ], function(e) {
    delete e.context.cropped;
  });



  ////// VDML + DI update /////////////////////////


  // update parent
  function updateParent(e) {
    var context = e.context;

    self.updateParent(context.shape || context.connection, context.oldParent);
  }

  function reverseUpdateParent(e) {
    var context = e.context;

    var element = context.shape || context.connection,
        // oldParent is the (old) new parent, because we are undoing
        oldParent = context.parent || context.newParent;

    self.updateParent(element, oldParent);
  }

  this.executed([ 'shape.move',
                  'shape.create',
                  'shape.delete',
                  'connection.create',
                  'connection.move',
                  'connection.delete' ], ifVdml(updateParent));

  this.reverted([ 'shape.move',
                  'shape.create',
                  'shape.delete',
                  'connection.create',
                  'connection.move',
                  'connection.delete' ], ifVdml(reverseUpdateParent));

  /*
   * ## Updating Parent
   *
   * When morphing a Process into a Collaboration or vice-versa,
   * make sure that both the *semantic* and *di* parent of each element
   * is updated.
   *
   */
  function updateRoot(event) {
    var context = event.context,
        oldRoot = context.oldRoot,
        children = oldRoot.children;

    forEach(children, function(child) {
      if (is(child, 'vdml:BaseElement')) {
        self.updateParent(child);
      }
    });
  }

  this.executed([ 'canvas.updateRoot' ], updateRoot);
  this.reverted([ 'canvas.updateRoot' ], updateRoot);


  // update bounds
  function updateBounds(e) {
    var shape = e.context.shape;

    if (!is(shape, 'vdml:BaseElement')) {
      return;
    }

    self.updateBounds(shape);
  }

  this.executed([ 'shape.move', 'shape.create', 'shape.resize' ], ifVdml(function(event) {

    // exclude labels because they're handled separately during shape.changed
    if (event.context.shape.type === 'label') {
      return;
    }

    updateBounds(event);
  }));

  this.reverted([ 'shape.move', 'shape.create', 'shape.resize' ], ifVdml(function(event) {

    // exclude labels because they're handled separately during shape.changed
    if (event.context.shape.type === 'label') {
      return;
    }

    updateBounds(event);
  }));

  // Handle labels separately. This is necessary, because the label bounds have to be updated
  // every time its shape changes, not only on move, create and resize.
  eventBus.on('shape.changed', function(event) {
    if (event.element.type === 'label') {
      updateBounds({ context: { shape: event.element } });
    }
  });

  // attach / detach connection
  function updateConnection(e) {
    self.updateConnection(e.context);
  }

  this.executed([
    'connection.create',
    'connection.move',
    'connection.delete',
    'connection.reconnectEnd',
    'connection.reconnectStart'
  ], ifVdml(updateConnection));

  this.reverted([
    'connection.create',
    'connection.move',
    'connection.delete',
    'connection.reconnectEnd',
    'connection.reconnectStart'
  ], ifVdml(updateConnection));


  // update waypoints
  function updateConnectionWaypoints(e) {
    self.updateConnectionWaypoints(e.context.connection);
  }

  this.executed([
    'connection.layout',
    'connection.move',
    'connection.updateWaypoints',
    'connection.reconnectEnd',
    'connection.reconnectStart'
  ], ifVdml(updateConnectionWaypoints));

  this.reverted([
    'connection.layout',
    'connection.move',
    'connection.updateWaypoints',
    'connection.reconnectEnd',
    'connection.reconnectStart'
  ], ifVdml(updateConnectionWaypoints));


  // update Default & Conditional flows
  this.executed([
    'connection.reconnectEnd',
    'connection.reconnectStart'
  ], ifVdml(function(e) {
    var context = e.context,
        connection = context.connection,
        businessObject = getBusinessObject(connection),
        oldSource = getBusinessObject(context.oldSource),
        oldTarget = getBusinessObject(context.oldTarget),
        newSource = getBusinessObject(connection.source),
        newTarget = getBusinessObject(connection.target);

    if (oldSource === newSource || oldTarget === newTarget) {
      return;
    }

    // on reconnectStart -> default flow
    if (oldSource && oldSource.default === businessObject) {
      context.default = oldSource.default;
      oldSource.default = undefined;
    }

    // on reconnectEnd -> default flow
    if ((businessObject.sourceRef && businessObject.sourceRef.default) &&
        !(is(newTarget, 'vdml:Activity') ||
          is(newTarget, 'vdml:EndEvent') ||
          is(newTarget, 'vdml:Gateway') ||
          is(newTarget, 'vdml:IntermediateThrowEvent')) ) {
      context.default = businessObject.sourceRef.default;
      businessObject.sourceRef.default = undefined;
    }

    // on reconnectStart -> conditional flow
    if (oldSource && (businessObject.conditionExpression) &&
      !(is(newSource, 'vdml:Activity') ||
        is(newSource, 'vdml:Gateway')) ) {
      context.conditionExpression = businessObject.conditionExpression;
      businessObject.conditionExpression = undefined;
    }

    // on reconnectEnd -> conditional flow
    if (oldTarget && (businessObject.conditionExpression) &&
        !(is(newTarget, 'vdml:Activity') ||
          is(newTarget, 'vdml:EndEvent') ||
          is(newTarget, 'vdml:Gateway') ||
          is(newTarget, 'vdml:IntermediateThrowEvent')) ) {
      context.conditionExpression = businessObject.conditionExpression;
      businessObject.conditionExpression = undefined;
    }
  }));

  this.reverted([
    'connection.reconnectEnd',
    'connection.reconnectStart'
  ], ifVdml(function(e) {
    var context = e.context,
        connection = context.connection,
        businessObject = getBusinessObject(connection),
        newSource = getBusinessObject(connection.source);

    // default flow
    if (context.default) {
      if (is(newSource, 'vdml:ExclusiveGateway') || is(newSource, 'vdml:InclusiveGateway') ||
          is(newSource, 'vdml:Activity')) {
        newSource.default = context.default;
      }
    }

    // conditional flow
    if (context.conditionExpression && is(newSource, 'vdml:Activity')) {
      businessObject.conditionExpression = context.conditionExpression;
    }
  }));

  // update attachments
  function updateAttachment(e) {
    self.updateAttachment(e.context);
  }

  this.executed([ 'element.updateAttachment' ], ifVdml(updateAttachment));
  this.reverted([ 'element.updateAttachment' ], ifVdml(updateAttachment));
}

inherits(VdmlUpdater, CommandInterceptor);

module.exports = VdmlUpdater;

VdmlUpdater.$inject = [ 'eventBus', 'vdmlFactory', 'connectionDocking', 'translate' ];


/////// implementation //////////////////////////////////

VdmlUpdater.prototype.updateAttachment = function(context) {

  var shape = context.shape,
      businessObject = shape.businessObject,
      host = shape.host;

  businessObject.attachedToRef = host && host.businessObject;
};

VdmlUpdater.prototype.updateParent = function(element, oldParent) {
  // do not update VDML 2.0 label parent
  if (element instanceof Model.Label) {
    return;
  }

  var parentShape = element.parent;

  var businessObject = element.businessObject,
      parentBusinessObject = parentShape && parentShape.businessObject,
      parentDi = parentBusinessObject && parentBusinessObject.di;

  if (is(element, 'vdml:FlowNode')) {
    this.updateFlowNodeRefs(businessObject, parentBusinessObject, oldParent && oldParent.businessObject);
  }

  if (is(element, 'vdml:DataOutputAssociation')) {
    if (element.source) {
      parentBusinessObject = element.source.businessObject;
    } else {
      parentBusinessObject = null;
    }
  }

  if (is(element, 'vdml:DataInputAssociation')) {
    if (element.target) {
      parentBusinessObject = element.target.businessObject;
    } else {
      parentBusinessObject = null;
    }
  }

  this.updateSemanticParent(businessObject, parentBusinessObject);

  if (is(element, 'vdml:DataObjectReference') && businessObject.dataObjectRef) {
    this.updateSemanticParent(businessObject.dataObjectRef, parentBusinessObject);
  }

  this.updateDiParent(businessObject.di, parentDi);
};


VdmlUpdater.prototype.updateBounds = function(shape) {

  var di = shape.businessObject.di;

  var bounds = (shape instanceof Model.Label) ? this._getLabel(di).bounds : di.bounds;

  assign(bounds, {
    x: shape.x,
    y: shape.y,
    width: shape.width,
    height: shape.height
  });
};

VdmlUpdater.prototype.updateFlowNodeRefs = function(businessObject, newContainment, oldContainment) {

  if (oldContainment === newContainment) {
    return;
  }

  var oldRefs, newRefs;

  if (is (oldContainment, 'vdml:Lane')) {
    oldRefs = oldContainment.get('flowNodeRef');
    Collections.remove(oldRefs, businessObject);
  }

  if (is(newContainment, 'vdml:Lane')) {
    newRefs = newContainment.get('flowNodeRef');
    Collections.add(newRefs, businessObject);
  }
};

VdmlUpdater.prototype.updateDiParent = function(di, parentDi) {

  if (parentDi && !is(parentDi, 'vdmldi:VDMLPlane')) {
    parentDi = parentDi.$parent;
  }

  if (di.$parent === parentDi) {
    return;
  }

  var planeElements = (parentDi || di.$parent).get('planeElement');

  if (parentDi) {
    planeElements.push(di);
    di.$parent = parentDi;
  } else {
    Collections.remove(planeElements, di);
    di.$parent = null;
  }
};

function getDefinitions(element) {
  while (element && !is(element, 'vdml:Definitions')) {
    element = element.$parent;
  }

  return element;
}

VdmlUpdater.prototype.getLaneSet = function(container) {

  var laneSet, laneSets;

  // vdml:Lane
  if (is(container, 'vdml:Lane')) {
    laneSet = container.childLaneSet;

    if (!laneSet) {
      laneSet = this._vdmlFactory.create('vdml:LaneSet');
      container.childLaneSet = laneSet;
      laneSet.$parent = container;
    }

    return laneSet;
  }

  // vdml:Participant
  if (is(container, 'vdml:Participant')) {
    container = container.processRef;
  }

  // vdml:FlowElementsContainer
  laneSets = container.get('laneSets');
  laneSet = laneSets[0];

  if (!laneSet) {
    laneSet = this._vdmlFactory.create('vdml:LaneSet');
    laneSet.$parent = container;
    laneSets.push(laneSet);
  }

  return laneSet;
};

VdmlUpdater.prototype.updateSemanticParent = function(businessObject, newParent, visualParent) {

  var containment,
      translate = this._translate;

  if (businessObject.$parent === newParent) {
    return;
  }

  if (is(businessObject, 'vdml:Lane')) {

    if (newParent) {
      newParent = this.getLaneSet(newParent);
    }

    containment = 'lanes';
  } else

  if (is(businessObject, 'vdml:FlowElement')) {

    if (newParent) {

      if (is(newParent, 'vdml:Participant')) {
        newParent = newParent.processRef;
      } else

      if (is(newParent, 'vdml:Lane')) {
        do {
          // unwrap Lane -> LaneSet -> (Lane | FlowElementsContainer)
          newParent = newParent.$parent.$parent;
        } while (is(newParent, 'vdml:Lane'));

      }
    }

    containment = 'flowElements';

  } else

  if (is(businessObject, 'vdml:Artifact')) {

    while (newParent &&
           !is(newParent, 'vdml:Process') &&
           !is(newParent, 'vdml:SubProcess') &&
           !is(newParent, 'vdml:Collaboration')) {

      if (is(newParent, 'vdml:Participant')) {
        newParent = newParent.processRef;
        break;
      } else {
        newParent = newParent.$parent;
      }
    }

    containment = 'artifacts';
  } else

  if (is(businessObject, 'vdml:MessageFlow')) {
    containment = 'messageFlows';

  } else

  if (is(businessObject, 'vdml:Participant')) {
    containment = 'participants';

    // make sure the participants process is properly attached / detached
    // from the XML document

    var process = businessObject.processRef,
        definitions;

    if (process) {
      definitions = getDefinitions(businessObject.$parent || newParent);

      if (businessObject.$parent) {
        Collections.remove(definitions.get('rootElements'), process);
        process.$parent = null;
      }

      if (newParent) {
        Collections.add(definitions.get('rootElements'), process);
        process.$parent = definitions;
      }
    }
  } else

  if (is(businessObject, 'vdml:DataOutputAssociation')) {
    containment = 'dataOutputAssociations';
  } else

  if (is(businessObject, 'vdml:DataInputAssociation')) {
    containment = 'dataInputAssociations';
  }

  if (!containment) {
    throw new Error(translate(
      'no parent for {element} in {parent}',
      {
        element: businessObject.id,
        parent: newParent.id
      }
    ));
  }

  var children;

  if (businessObject.$parent) {
    // remove from old parent
    children = businessObject.$parent.get(containment);
    Collections.remove(children, businessObject);
  }

  if (!newParent) {
    businessObject.$parent = null;
  } else {
    // add to new parent
    children = newParent.get(containment);
    children.push(businessObject);
    businessObject.$parent = newParent;
  }

  if (visualParent) {
    var diChildren = visualParent.get(containment);

    Collections.remove(children, businessObject);

    if (newParent) {

      if (!diChildren) {
        diChildren = [];
        newParent.set(containment, diChildren);
      }

      diChildren.push(businessObject);
    }
  }
};


VdmlUpdater.prototype.updateConnectionWaypoints = function(connection) {
  connection.businessObject.di.set('waypoint', this._vdmlFactory.createDiWaypoints(connection.waypoints));
};


VdmlUpdater.prototype.updateConnection = function(context) {

  var connection = context.connection,
      businessObject = getBusinessObject(connection),
      newSource = getBusinessObject(connection.source),
      newTarget = getBusinessObject(connection.target),
      visualParent;

  if (!is(businessObject, 'vdml:DataAssociation')) {

    var inverseSet = is(businessObject, 'vdml:SequenceFlow');

    if (businessObject.sourceRef !== newSource) {
      if (inverseSet) {
        Collections.remove(businessObject.sourceRef && businessObject.sourceRef.get('outgoing'), businessObject);

        if (newSource && newSource.get('outgoing')) {
          newSource.get('outgoing').push(businessObject);
        }
      }

      businessObject.sourceRef = newSource;
    }

    if (businessObject.targetRef !== newTarget) {
      if (inverseSet) {
        Collections.remove(businessObject.targetRef && businessObject.targetRef.get('incoming'), businessObject);

        if (newTarget && newTarget.get('incoming')) {
          newTarget.get('incoming').push(businessObject);
        }
      }

      businessObject.targetRef = newTarget;
    }
  } else

  if (is(businessObject, 'vdml:DataInputAssociation')) {
    // handle obnoxious isMany sourceRef
    businessObject.get('sourceRef')[0] = newSource;

    visualParent = context.parent || context.newParent || newTarget;

    this.updateSemanticParent(businessObject, newTarget, parent.businessObject);
  } else

  if (is(businessObject, 'vdml:DataOutputAssociation')) {
    visualParent = context.parent || context.newParent || newSource;

    this.updateSemanticParent(businessObject, newSource, visualParent);

    // targetRef = new target
    businessObject.targetRef = newTarget;
  }

  this.updateConnectionWaypoints(connection);
};


/////// helpers /////////////////////////////////////////

VdmlUpdater.prototype._getLabel = function(di) {
  if (!di.label) {
    di.label = this._vdmlFactory.createDiLabel();
  }

  return di.label;
};


/**
 * Make sure the event listener is only called
 * if the touched element is a VDML element.
 *
 * @param  {Function} fn
 * @return {Function} guarded function
 */
function ifVdml(fn) {

  return function(event) {

    var context = event.context,
        element = context.shape || context.connection;

    if (is(element, 'vdml:BaseElement')) {
      fn(event);
    }
  };
}
