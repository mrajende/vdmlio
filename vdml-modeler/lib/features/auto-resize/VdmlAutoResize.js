var AutoResize = require('diagram-js/lib/features/auto-resize/AutoResize');

var inherits = require('inherits');

var is = require('../../util/ModelUtil').is;

/**
 * Sub class of the AutoResize module which implements a VDML
 * specific resize function.
 */
function VdmlAutoResize(eventBus, elementRegistry, modeling, rules) {
  AutoResize.call(this, eventBus, elementRegistry, modeling, rules);
}

VdmlAutoResize.$inject = [ 'eventBus', 'elementRegistry', 'modeling', 'rules' ];

inherits(VdmlAutoResize, AutoResize);

module.exports = VdmlAutoResize;


/**
 * Resize shapes and lanes
 *
 * @param  {djs.model.Shape} target
 * @param  {Object} newBounds
 */
VdmlAutoResize.prototype.resize = function(target, newBounds) {

  if (is(target, 'vdml:Lane')) {
    this._modeling.resizeLane(target, newBounds);
  } else {
    this._modeling.resizeShape(target, newBounds);
  }
};