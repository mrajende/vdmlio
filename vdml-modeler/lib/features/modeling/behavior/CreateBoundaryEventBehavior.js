'use strict';

var inherits = require('inherits');

var CommandInterceptor = require('diagram-js/lib/command/CommandInterceptor');

var is = require('../../../util/ModelUtil').is;


/**
 * VDML specific create boundary event behavior
 */
function CreateBoundaryEventBehavior(eventBus, modeling, elementFactory, vdmlFactory) {

  CommandInterceptor.call(this, eventBus);

  /**
   * replace intermediate event with boundary event when
   * attaching it to a shape
   */

  this.preExecute('shape.create', function(context) {
    var shape = context.shape,
        host = context.host,
        businessObject,
        boundaryEvent;

    var attrs = {
      cancelActivity: true
    };

    if (host && is(shape, 'vdml:IntermediateThrowEvent')) {
      attrs.attachedToRef = host.businessObject;

      businessObject = vdmlFactory.create('vdml:BoundaryEvent', attrs);

      boundaryEvent = {
        type: 'vdml:BoundaryEvent',
        businessObject: businessObject
      };

      context.shape = elementFactory.createShape(boundaryEvent);
    }
  }, true);
}

CreateBoundaryEventBehavior.$inject = [ 'eventBus', 'modeling', 'elementFactory', 'vdmlFactory' ];

inherits(CreateBoundaryEventBehavior, CommandInterceptor);

module.exports = CreateBoundaryEventBehavior;
