'use strict';

var inherits = require('inherits');

var CommandInterceptor = require('diagram-js/lib/command/CommandInterceptor');

var is = require('../../../util/ModelUtil').is;

/**
 * VDML specific create data object behavior
 */
function CreateDataObjectBehavior(eventBus, vdmlFactory, moddle) {

  CommandInterceptor.call(this, eventBus);

  this.preExecute('shape.create', function(event) {

    var context = event.context,
        shape = context.shape;

    if (is(shape, 'vdml:DataObjectReference') && shape.type !== 'label') {

      // create a DataObject every time a DataObjectReference is created
      var dataObject = vdmlFactory.create('vdml:DataObject');

      // set the reference to the DataObject
      shape.businessObject.dataObjectRef = dataObject;
    }
  });

}

CreateDataObjectBehavior.$inject = [ 'eventBus', 'vdmlFactory', 'moddle' ];

inherits(CreateDataObjectBehavior, CommandInterceptor);

module.exports = CreateDataObjectBehavior;
