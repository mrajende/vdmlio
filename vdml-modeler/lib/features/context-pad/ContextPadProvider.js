'use strict';


var assign = require('lodash/object/assign'),
    forEach = require('lodash/collection/forEach'),
    isArray = require('lodash/lang/isArray'),
    is = require('../../util/ModelUtil').is,
    isExpanded = require('../../util/DiUtil').isExpanded,
    isAny = require('../modeling/util/ModelingUtil').isAny,
    getChildLanes = require('../modeling/util/LaneUtil').getChildLanes,
    isEventSubProcess = require('../../util/DiUtil').isEventSubProcess,
    hasPrimaryModifier = require('diagram-js/lib/util/Mouse').hasPrimaryModifier;

/**
 * A provider for VDML 2.0 elements context pad
 */
function ContextPadProvider(eventBus, contextPad, modeling, elementFactory,
                            connect, create, popupMenu,
                            canvas, rules, translate) {

  contextPad.registerProvider(this);

  this._contextPad = contextPad;

  this._modeling = modeling;

  this._elementFactory = elementFactory;
  this._connect = connect;
  this._create = create;
  this._popupMenu = popupMenu;
  this._canvas  = canvas;
  this._rules = rules;
  this._translate = translate;


  eventBus.on('create.end', 250, function(event) {
    var shape = event.context.shape;

    if (!hasPrimaryModifier(event)) {
      return;
    }

    var entries = contextPad.getEntries(shape);

    if (entries.replace) {
      entries.replace.action.click(event, shape);
    }
  });
}

ContextPadProvider.$inject = [
  'eventBus',
  'contextPad',
  'modeling',
  'elementFactory',
  'connect',
  'create',
  'popupMenu',
  'canvas',
  'rules',
  'translate'
];

module.exports = ContextPadProvider;


ContextPadProvider.prototype.getContextPadEntries = function(element) {

  var contextPad = this._contextPad,
      modeling = this._modeling,

      elementFactory = this._elementFactory,
      connect = this._connect,
      create = this._create,
      popupMenu = this._popupMenu,
      canvas = this._canvas,
      rules = this._rules,

      translate = this._translate;

  var actions = {};

  if (element.type === 'label') {
    return actions;
  }

  var businessObject = element.businessObject;

  function startConnect(event, element, autoActivate) {
    connect.start(event, element, autoActivate);
  }

  function removeElement(e) {
    modeling.removeElements([ element ]);
  }
  function mapElement(e) {
      debugger;
      if (window.require1) {
          window.require1(['appcommon/com/vbee/data/DataManager', "appviews/ecomap/views/designer/MappingWizardViewModel"], function (DataManager, MappingWizardViewModel) {
              var dataManager = DataManager.getDataManager();
              var wizard = self.wizard = MappingWizardViewModel.getInstance(window.vdmModelView.model, {}, {}, businessObject, function () {

              });
              wizard.startWizard();
          });
      }
  }
  function showProperties(e) {
      debugger;
      if (window.require1) {
          window.require1(['appcommon/com/vbee/data/DataManager', "appviews/ecomap/views/designer/ShapePropertiesViewModel"], function (DataManager, ShapePropertiesViewModel) {
              var dataManager = DataManager.getDataManager();
              var wizard = self.wizard = ShapePropertiesViewModel.getInstance(window.vdmModelView.model, businessObject, function () {

              });
              wizard.startWizard();
          });
      }
  }
  function setBackgroundImage(e) {
      if (window.require1) {
          window.require1(['domtoimage'], function () {
              chrome.fileSystem.chooseEntry({
                  type: 'openFile', accepts: [
                      { description: "Image", extensions: ['jpg','png'] }
                  ], acceptsAllTypes: true
              }, function (f) {
                  if (chrome.runtime.lastError) {
                      console.log(chrome.runtime.lastError);
                      fileHandled('Error opening Image');
                  }
                  else {
                      f.file(function (fileObject) {
                          var reader = new FileReader();
                          reader.onload = function (ev) {
                              businessObject.set('vdml:backgroundUrl', reader.result);
                              //cmdHelper.updateProperties(e, {});
                              modeling.updateProperties(element, {});
                          };
                          reader.readAsDataURL(fileObject);
                      });
                  }
              });
          });
      }
  }
  function getReplaceMenuPosition(element) {

    var Y_OFFSET = 5;

    var diagramContainer = canvas.getContainer(),
        pad = contextPad.getPad(element).html;

    var diagramRect = diagramContainer.getBoundingClientRect(),
        padRect = pad.getBoundingClientRect();

    var top = padRect.top - diagramRect.top;
    var left = padRect.left - diagramRect.left;

    var pos = {
      x: left,
      y: top + padRect.height + Y_OFFSET
    };

    return pos;
  }


  /**
   * Create an append action
   *
   * @param {String} type
   * @param {String} className
   * @param {String} [title]
   * @param {Object} [options]
   *
   * @return {Object} descriptor
   */
  function appendAction(type, className, title, options) {

    if (typeof title !== 'string') {
      options = title;
      title = translate('Append {type}', { type: type.replace(/^vdml\:/, '') });
    }

    function appendListener(event, element) {

      var shape = elementFactory.createShape(assign({ type: type }, options));
      create.start(event, shape, element);
    }

    return {
      group: 'model',
      className: className,
      title: title,
      action: {
        dragstart: appendListener,
        click: appendListener
      }
    };
  }

  function splitLaneHandler(count) {

    return function(event, element) {
      // actual split
      modeling.splitLane(element, count);

      // refresh context pad after split to
      // get rid of split icons
      contextPad.open(element, true);
    };
  }


  if (isAny(businessObject, [ 'vdml:Lane', 'vdml:Participant' ]) && isExpanded(businessObject)) {

    var childLanes = getChildLanes(element);

    assign(actions, {
      'lane-insert-above': {
        group: 'lane-insert-above',
        className: 'bpmn-icon-lane-insert-above',
        title: translate('Add Lane above'),
        action: {
          click: function(event, element) {
            modeling.addLane(element, 'top');
          }
        }
      }
    });

    if (childLanes.length < 2) {

      if (element.height >= 120) {
        assign(actions, {
          'lane-divide-two': {
            group: 'lane-divide',
            className: 'bpmn-icon-lane-divide-two',
            title: translate('Divide into two Lanes'),
            action: {
              click: splitLaneHandler(2)
            }
          }
        });
      }

      if (element.height >= 180) {
        assign(actions, {
          'lane-divide-three': {
            group: 'lane-divide',
            className: 'bpmn-icon-lane-divide-three',
            title: translate('Divide into three Lanes'),
            action: {
              click: splitLaneHandler(3)
            }
          }
        });
      }
    }

    assign(actions, {
      'lane-insert-below': {
        group: 'lane-insert-below',
        className: 'bpmn-icon-lane-insert-below',
        title: translate('Add Lane below'),
        action: {
          click: function(event, element) {
            modeling.addLane(element, 'bottom');
          }
        }
      }
    });

  }

  if (is(businessObject, 'vdml:FlowNode')) {
      assign(actions, {
          //'append.append-collaboration': appendAction('vdml:Collaboration', 'bpmn-icon-task'),
          'append.append-marketSegment': appendAction('vdml:MarketSegment', 'bpmn-icon-task'),
          'append.append-enterprise': appendAction('vdml:Enterprise', 'bpmn-icon-task'),
          'append.append-individual': appendAction('vdml:Individual', 'bpmn-icon-user'),
          'append.append-role': appendAction('vdml:Role', 'bpmn-icon-task'),
          'append.append-businessModel': appendAction('vdml:BusinessModel', 'bpmn-icon-task'),
          'append.append-valueProposition': appendAction('vdml:ValueProposition', 'bpmn-icon-task')
      });
  }

  var replaceMenu;

  if (popupMenu._providers['vdml-replace']) {
    //replaceMenu = popupMenu.create('vdml-replace', element);
  }

  if (replaceMenu && !replaceMenu.isEmpty()) {

    // Replace menu entry
    assign(actions, {
      'replace': {
        group: 'edit',
        className: 'bpmn-icon-screw-wrench',
        title: translate('Change type'),
        action: {
          click: function(event, element) {
            replaceMenu.open(assign(getReplaceMenuPosition(element), {
              cursor: { x: event.x, y: event.y }
            }), element);
          }
        }
      }
    });
  }

  if (isAny(businessObject, [
    'vdml:FlowNode'
  ]) ) {

      assign(actions, {
          'append.text-annotation': appendAction('vdml:TextAnnotation', 'bpmn-icon-text-annotation'),

          'connect': {
              group: 'connect',
              className: 'bpmn-icon-connection-multi',
              title: translate('Connect using Sequence'),
              action: {
                  click: startConnect,
                  dragstart: startConnect
              }
          }
      });
  }
  if (isAny(businessObject, [
 'vdml:FlowNode','vdml:BusinessItem'
  ])) {
    if (!businessObject.get('vdml:mid')) {
        assign(actions, {
            'map': {
                group: 'edit',
                className: 'bpmn-icon-data-store',
                title: translate('Map'),
                action: {
                    click: mapElement,
                    dragstart: mapElement
                }
            }
        });
    }
    assign(actions, {
        'map': {
            group: 'edit',
            className: 'bpmn-icon-script-task',
            title: translate('Properties'),
            action: {
                click: showProperties,
                dragstart: showProperties
            }
        }
    });
    assign(actions, {
        'background': {
            group: 'edit',
            className: 'bpmn-icon-data-store',
            title: translate('Logo'),
            action: {
                click: setBackgroundImage,
                dragstart: setBackgroundImage
            }
        }
    });
   
  }

  // delete element entry, only show if allowed by rules
  var deleteAllowed = rules.allowed('elements.delete', { elements: [ element ] });

  if (isArray(deleteAllowed)) {
    // was the element returned as a deletion candidate?
    deleteAllowed = deleteAllowed[0] === element;
  }

  if (deleteAllowed) {
    assign(actions, {
      'delete': {
        group: 'edit',
        className: 'bpmn-icon-trash',
        title: translate('Remove'),
        action: {
          click: removeElement,
          dragstart: removeElement
        }
      }
    });
  }

  return actions;
};

function isEventType(eventBo, type, definition) {

  var isType = eventBo.$instanceOf(type);
  var isDefinition = false;

  var definitions = eventBo.eventDefinitions || [];
  forEach(definitions, function(def) {
    if (def.$type === definition) {
      isDefinition = true;
    }
  });

  return isType && isDefinition;
}
