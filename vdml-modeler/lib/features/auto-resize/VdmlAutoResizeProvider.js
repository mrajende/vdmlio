'use strict';

var is = require('../../util/ModelUtil').is;

var inherits = require('inherits');

var forEach = require('lodash/collection/forEach');

var AutoResizeProvider = require('diagram-js/lib/features/auto-resize/AutoResizeProvider');

/**
 * This module is a provider for automatically resizing parent VDML elements
 */
function VdmlAutoResizeProvider(eventBus, modeling) {
  AutoResizeProvider.call(this, eventBus);

  this._modeling = modeling;
}

inherits(VdmlAutoResizeProvider, AutoResizeProvider);

VdmlAutoResizeProvider.$inject = [ 'eventBus', 'modeling' ];

module.exports = VdmlAutoResizeProvider;


/**
 * Check if the given target can be expanded
 *
 * @param  {djs.model.Shape} target
 *
 * @return {boolean}
 */
VdmlAutoResizeProvider.prototype.canResize = function(elements, target) {

  if (!is(target, 'vdml:Participant') && !is(target, 'vdml:Lane') && !(is(target, 'vdml:SubProcess'))) {
    return false;
  }

  var canResize = true;

  forEach(elements, function(element) {

    if (is(element, 'vdml:Lane') || element.labelTarget) {
      canResize = false;
      return;
    }
  });

  return canResize;
};
