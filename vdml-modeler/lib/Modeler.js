'use strict';

var inherits = require('inherits');

var Ids = require('ids');

var Viewer = require('./Viewer');

var NavigatedViewer = require('./NavigatedViewer');

var initialDiagram =
  '<?xml version="1.0" encoding="UTF-8"?>' +
  '<vdml:definitions xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" ' +
                    'xmlns:vdml="http://www.omg.org/spec/VDML/20100524/MODEL" ' +
                    'xmlns:vdmldi="http://www.omg.org/spec/VDML/20100524/DI" ' +
                    'xmlns:dc="http://www.omg.org/spec/DD/20100524/DC" ' +
                    'targetNamespace="http://vdml.io/schema/vdml" ' +
                    'id="Definitions_1">' +
    '<vdml:process id="Process_1" isExecutable="false">' +
      '<vdml:startEvent id="StartEvent_1"/>' +
    '</vdml:process>' +
    '<vdmldi:VDMLDiagram id="VDMLDiagram_1">' +
      '<vdmldi:VDMLPlane id="VDMLPlane_1" vdmlElement="Process_1">' +
        '<vdmldi:VDMLShape id="_VDMLShape_StartEvent_2" vdmlElement="StartEvent_1">' +
          '<dc:Bounds height="36.0" width="36.0" x="173.0" y="102.0"/>' +
        '</vdmldi:VDMLShape>' +
      '</vdmldi:VDMLPlane>' +
    '</vdmldi:VDMLDiagram>' +
  '</vdml:definitions>';


/**
 * A modeler for VDML 2.0 diagrams.
 *
 *
 * ## Extending the Modeler
 *
 * In order to extend the viewer pass extension modules to bootstrap via the
 * `additionalModules` option. An extension module is an object that exposes
 * named services.
 *
 * The following example depicts the integration of a simple
 * logging component that integrates with interaction events:
 *
 *
 * ```javascript
 *
 * // logging component
 * function InteractionLogger(eventBus) {
 *   eventBus.on('element.hover', function(event) {
 *     console.log()
 *   })
 * }
 *
 * InteractionLogger.$inject = [ 'eventBus' ]; // minification save
 *
 * // extension module
 * var extensionModule = {
 *   __init__: [ 'interactionLogger' ],
 *   interactionLogger: [ 'type', InteractionLogger ]
 * };
 *
 * // extend the viewer
 * var vdmlModeler = new Modeler({ additionalModules: [ extensionModule ] });
 * vdmlModeler.importXML(...);
 * ```
 *
 *
 * ## Customizing / Replacing Components
 *
 * You can replace individual diagram components by redefining them in override modules.
 * This works for all components, including those defined in the core.
 *
 * Pass in override modules via the `options.additionalModules` flag like this:
 *
 * ```javascript
 * function CustomContextPadProvider(contextPad) {
 *
 *   contextPad.registerProvider(this);
 *
 *   this.getContextPadEntries = function(element) {
 *     // no entries, effectively disable the context pad
 *     return {};
 *   };
 * }
 *
 * CustomContextPadProvider.$inject = [ 'contextPad' ];
 *
 * var overrideModule = {
 *   contextPadProvider: [ 'type', CustomContextPadProvider ]
 * };
 *
 * var vdmlModeler = new Modeler({ additionalModules: [ overrideModule ]});
 * ```
 *
 * @param {Object} [options] configuration options to pass to the viewer
 * @param {DOMElement} [options.container] the container to render the viewer in, defaults to body.
 * @param {String|Number} [options.width] the width of the viewer
 * @param {String|Number} [options.height] the height of the viewer
 * @param {Object} [options.moddleExtensions] extension packages to provide
 * @param {Array<didi.Module>} [options.modules] a list of modules to override the default modules
 * @param {Array<didi.Module>} [options.additionalModules] a list of modules to use with the default modules
 */
function Modeler(options) {
  Viewer.call(this, options);

  // hook ID collection into the modeler
  this.on('import.parse.complete', function(event) {
    if (!event.error) {
      this._collectIds(event.definitions, event.context);
    }
  }, this);

  this.on('diagram.destroy', function() {
    this.moddle.ids.clear();
  }, this);
}

inherits(Modeler, Viewer);

module.exports = Modeler;

module.exports.Viewer = Viewer;

module.exports.NavigatedViewer = NavigatedViewer;

/**
 * Create a new diagram to start modeling.
 *
 * @param {Function} [done]
 */
Modeler.prototype.createDiagram = function(done) {
  return this.importXML(initialDiagram, done);
};

/**
 * Create a moddle instance, attaching ids to it.
 *
 * @param {Object} options
 */
Modeler.prototype._createModdle = function(options) {
  var moddle = Viewer.prototype._createModdle.call(this, options);

  // attach ids to moddle to be able to track
  // and validated ids in the VDML 2.0 XML document
  // tree
  moddle.ids = new Ids([ 32, 36, 1 ]);

  return moddle;
};

/**
 * Collect ids processed during parsing of the
 * definitions object.
 *
 * @param {ModdleElement} definitions
 * @param {Context} context
 */
Modeler.prototype._collectIds = function(definitions, context) {

  var moddle = definitions.$model,
      ids = moddle.ids,
      id;

  // remove references from previous import
  ids.clear();

  for (id in context.elementsById) {
    ids.claim(id, context.elementsById[id]);
  }
};


Modeler.prototype._interactionModules = [
  // non-modeling components
  require('diagram-js/lib/navigation/movecanvas'),
  require('diagram-js/lib/navigation/touch'),
  require('diagram-js/lib/navigation/zoomscroll')
];

Modeler.prototype._modelingModules = [
  // modeling components
  require('diagram-js/lib/features/auto-scroll'),
  require('diagram-js/lib/features/bendpoints'),
  require('diagram-js/lib/features/move'),
  require('diagram-js/lib/features/resize'),
  require('./features/auto-resize'),
  require('./features/editor-actions'),
  require('./features/context-pad'),
  require('./features/keyboard'),
  require('./features/label-editing'),
  require('./features/modeling'),
  require('./features/palette'),
  require('./features/replace-preview'),
  require('./features/snapping'),
  require('bpmn-js-properties-panel'),
  require('bpmn-js-properties-panel/lib/provider/bpmn')
];


// modules the modeler is composed of
//
// - viewer modules
// - interaction modules
// - modeling modules

Modeler.prototype._modules = [].concat(
  Modeler.prototype._modules,
  Modeler.prototype._interactionModules,
  Modeler.prototype._modelingModules);
