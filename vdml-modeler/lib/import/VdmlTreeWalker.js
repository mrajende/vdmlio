'use strict';

var filter = require('lodash/collection/filter'),
    find = require('lodash/collection/find'),
    forEach = require('lodash/collection/forEach');

var Refs = require('object-refs');

var elementToString = require('./Util').elementToString;

var diRefs = new Refs({ name: 'vdmlElement', enumerable: true }, { name: 'di' });

/**
 * Returns true if an element has the given meta-model type
 *
 * @param  {ModdleElement}  element
 * @param  {String}         type
 *
 * @return {Boolean}
 */
function is(element, type) {
  return element.$instanceOf(type);
}


/**
 * Find a suitable display candidate for definitions where the DI does not
 * correctly specify one.
 */
function findDisplayCandidate(definitions) {
  return find(definitions.rootElements, function(e) {
    return is(e, 'vdml:EcoMap');
  });
}


function VdmlTreeWalker(handler, translate) {

  // list of containers already walked
  var handledElements = {};

  // list of elements to handle deferred to ensure
  // prerequisites are drawn
  var deferred = [];

  ///// Helpers /////////////////////////////////

  function contextual(fn, ctx) {
    return function(e) {
      fn(e, ctx);
    };
  }

  function handled(element) {
    handledElements[element.id] = element;
  }

  function isHandled(element) {
    return handledElements[element.id];
  }

  function visit(element, ctx) {

    var gfx = element.gfx;

    // avoid multiple rendering of elements
    if (gfx) {
      throw new Error(
        translate('already rendered {element}', { element: elementToString(element) })
      );
    }

    // call handler
    return handler.element(element, ctx);
  }

  function visitRoot(element, diagram) {
    return handler.root(element, diagram);
  }

  function visitIfDi(element, ctx) {

    try {
      var gfx = element.di && visit(element, ctx);

      handled(element);

      return gfx;
    } catch (e) {
      logError(e.message, { element: element, error: e });

      console.error(translate('failed to import {element}', { element: elementToString(element) }));
      console.error(e);
    }
  }

  function logError(message, context) {
    handler.error(message, context);
  }

  ////// DI handling ////////////////////////////

  function registerDi(di) {
    var vdmlElement = di.vdmlElement;

    if (vdmlElement) {
      if (vdmlElement.di) {
        logError(
          translate('multiple DI elements defined for {element}', {
            element: elementToString(vdmlElement)
          }),
          { element: vdmlElement  }
        );
      } else {
        diRefs.bind(vdmlElement, 'di');
        vdmlElement.di = di;
      }
    } else {
      logError(
        translate('no vdmlElement referenced in {element}', {
          element: elementToString(di)
        }),
        { element: di }
      );
    }
  }

  function handleDiagram(diagram) {
    handlePlane(diagram.plane);
  }

  function handlePlane(plane) {
    registerDi(plane);

    forEach(plane.planeElement, handlePlaneElement);
  }

  function handlePlaneElement(planeElement) {
    registerDi(planeElement);
  }


  ////// Semantic handling //////////////////////

  /**
   * Handle definitions and return the rendered diagram (if any)
   *
   * @param {ModdleElement} definitions to walk and import
   * @param {ModdleElement} [diagram] specific diagram to import and display
   *
   * @throws {Error} if no diagram to display could be found
   */
  function handleDefinitions(definitions, diagram) {
    // make sure we walk the correct vdmlElement

    var diagrams = definitions.diagrams;

    if (diagram && diagrams.indexOf(diagram) === -1) {
      throw new Error(translate('diagram not part of vdml:Definitions'));
    }

    if (!diagram && diagrams && diagrams.length) {
      diagram = diagrams[0];
    }

    // no diagram -> nothing to import
    if (!diagram) {
      throw new Error(translate('no diagram to display'));
    }

    // load DI from selected diagram only
    handleDiagram(diagram);


    var plane = diagram.plane;

    if (!plane) {
      throw new Error(translate(
        'no plane for {element}',
        { element: elementToString(diagram) }
      ));
    }

    var rootElement = plane.vdmlElement;

    // ensure we default to a suitable display candidate (process or collaboration),
    // even if non is specified in DI
    if (!rootElement) {
      rootElement = findDisplayCandidate(definitions);

      if (!rootElement) {
        throw new Error(translate('no process or collaboration to display'));
      } else {

        logError(
          translate('correcting missing vdmlElement on {plane} to {rootElement}', {
            plane: elementToString(plane),
            rootElement: elementToString(rootElement)
          })
        );

        // correct DI on the fly
        plane.vdmlElement = rootElement;
        registerDi(plane);
      }
    }


    var ctx = visitRoot(rootElement, plane);

    if (is(rootElement, 'vdml:EcoMap')) {
      handleProcess(rootElement, ctx);
    } else if (is(rootElement, 'vdml:Collaboration')) {
      handleCollaboration(rootElement, ctx);

      // force drawing of everything not yet drawn that is part of the target DI
      handleUnhandledProcesses(definitions.rootElements, ctx);
    } else {
      throw new Error(
        translate('unsupported vdmlElement for {plane}: {rootElement}', {
          plane: elementToString(plane),
          rootElement: elementToString(rootElement)
        })
      );
    }

    // handle all deferred elements
    handleDeferred(deferred);
  }

  function handleDeferred(deferred) {
    forEach(deferred, function(d) { d(); });
  }

  function handleProcess(process, context) {
      //TODO
    handleFlowElementsContainer(process, context);
    handleIoSpecification(process.ioSpecification, context);

    handleArtifacts(process.artifacts, context);

    // log process handled
    handled(process);
  }

  function handleUnhandledProcesses(rootElements) {

    // walk through all processes that have not yet been drawn and draw them
    // if they contain lanes with DI information.
    // we do this to pass the free-floating lane test cases in the MIWG test suite
    var processes = filter(rootElements, function(e) {
      return !isHandled(e) && is(e, 'vdml:Process') && e.laneSets;
    });

    processes.forEach(contextual(handleProcess));
  }

  function handleMessageFlow(messageFlow, context) {
    visitIfDi(messageFlow, context);
  }

  function handleMessageFlows(messageFlows, context) {
    forEach(messageFlows, contextual(handleMessageFlow, context));
  }

  function handleDataAssociation(association, context) {
    visitIfDi(association, context);
  }

  function handleFlow(flow, context) {
    visitIfDi(flow, context);
  }

  function handleDataOutput(dataOutput, context) {
    visitIfDi(dataOutput, context);
  }

  function handleArtifact(artifact, context) {

    // vdml:TextAnnotation
    // vdml:Group
    // vdml:Association

    visitIfDi(artifact, context);
  }

  function handleArtifacts(artifacts, context) {

    forEach(artifacts, function(e) {
      if (is(e, 'vdml:Association')) {
        deferred.push(function() {
          handleArtifact(e, context);
        });
      } else {
        handleArtifact(e, context);
      }
    });
  }

  function handleIoSpecification(flowNode, context) {

      if (!flowNode) {
      return;
    }

      forEach(flowNode.flows, contextual(handleFlow, context));
  }

  function handleSubProcess(subProcess, context) {
    handleFlowElementsContainer(subProcess, context);
    handleArtifacts(subProcess.artifacts, context);
  }

  function handleFlowNode(flowNode, context) {
    var childCtx = visitIfDi(flowNode, context);

    if (is(flowNode, 'vdml:SubProcess')) {
      handleSubProcess(flowNode, childCtx || context);
    }

    if (is(flowNode, 'vdml:Participant')) {
        deferred.push(function () {
            handleIoSpecification(flowNode, context);
        });
    }

    // defer handling of associations
    // affected types:
    //
    //   * vdml:Activity
    //   * vdml:ThrowEvent
    //   * vdml:CatchEvent
    //
    deferred.push(function() {
      forEach(flowNode.dataInputAssociations, contextual(handleDataAssociation, context));
      forEach(flowNode.dataOutputAssociations, contextual(handleDataAssociation, context));
    });
  }

  function handleSequenceFlow(sequenceFlow, context) {
    visitIfDi(sequenceFlow, context);
  }

  function handleDataElement(dataObject, context) {
    visitIfDi(dataObject, context);
  }

  function handleBoundaryEvent(dataObject, context) {
    visitIfDi(dataObject, context);
  }

  function handleLane(lane, context) {
    var newContext = visitIfDi(lane, context);

    if (lane.childLaneSet) {
      handleLaneSet(lane.childLaneSet, newContext || context);
    }

    wireFlowNodeRefs(lane);
  }

  function handleLaneSet(laneSet, context) {
    forEach(laneSet.lanes, contextual(handleLane, context));
  }

  function handleLaneSets(laneSets, context) {
    forEach(laneSets, contextual(handleLaneSet, context));
  }

  function handleFlowElementsContainer(container, context) {
    if (container.laneSets) {
      handleLaneSets(container.laneSets, context);
    }

    handleFlowElements(container.flowElements, context);
  }

  function handleFlowElements(flowElements, context) {
    forEach(flowElements, function(e) {
      if (is(e, 'vdml:SequenceFlow')) {
        deferred.push(function() {
          handleSequenceFlow(e, context);
        });
      } else if (is(e, 'vdml:BoundaryEvent')) {
        deferred.unshift(function() {
          handleBoundaryEvent(e, context);
        });
      } else if (is(e, 'vdml:FlowNode')) {
        handleFlowNode(e, context);
      } else if (is(e, 'vdml:DataObject')) {
        // SKIP (assume correct referencing via DataObjectReference)
      } else if (is(e, 'vdml:DataStoreReference')) {
        handleDataElement(e, context);
      } else if (is(e, 'vdml:DataObjectReference')) {
        handleDataElement(e, context);
      } else {
        logError(
          translate('unrecognized flowElement {element} in context {context}', {
            element: elementToString(e),
            context: (context ? elementToString(context.businessObject) : 'null')
          }),
          { element: e, context: context }
        );
      }
    });
  }

  function handleParticipant(participant, context) {
    var newCtx = visitIfDi(participant, context);

    var process = participant.processRef;
    if (process) {
      handleProcess(process, newCtx || context);
    }
  }

  function handleCollaboration(collaboration) {

    forEach(collaboration.participants, contextual(handleParticipant));

    handleArtifacts(collaboration.artifacts);

    // handle message flows latest in the process
    deferred.push(function() {
      handleMessageFlows(collaboration.messageFlows);
    });
  }


  function wireFlowNodeRefs(lane) {
    // wire the virtual flowNodeRefs <-> relationship
    forEach(lane.flowNodeRef, function(flowNode) {
      var lanes = flowNode.get('lanes');

      if (lanes) {
        lanes.push(lane);
      }
    });
  }

  ///// API ////////////////////////////////

  return {
    handleDefinitions: handleDefinitions
  };
}

module.exports = VdmlTreeWalker;