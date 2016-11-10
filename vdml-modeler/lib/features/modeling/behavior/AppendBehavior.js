'use strict';

var inherits = require('inherits');

var is = require('../../../util/ModelUtil').is;

var CommandInterceptor = require('diagram-js/lib/command/CommandInterceptor');


function AppendBehavior(eventBus, elementFactory, vdmlRules) {

  CommandInterceptor.call(this, eventBus);

  // assign correct shape position unless already set

  this.preExecute('shape.append', function(context) {

    var source = context.source,
        shape = context.shape;

    if (!context.position) {

      if (is(shape, 'vdml:TextAnnotation')) {
        context.position = {
          x: source.x + source.width / 2 + 75,
          y: source.y - (50) - shape.height / 2
        };
      } else {
        context.position = {
          x: source.x + source.width + 80 + shape.width / 2,
          y: source.y + source.height / 2
        };
      }
    }
  }, true);
}


AppendBehavior.$inject = [ 'eventBus', 'elementFactory', 'vdmlRules' ];

inherits(AppendBehavior, CommandInterceptor);

module.exports = AppendBehavior;