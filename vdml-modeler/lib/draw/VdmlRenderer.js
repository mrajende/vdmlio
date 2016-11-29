'use strict';

var inherits = require('inherits'),
    isObject = require('lodash/lang/isObject'),
    assign = require('lodash/object/assign'),
    forEach = require('lodash/collection/forEach'),
    every = require('lodash/collection/every'),
    includes = require('lodash/collection/includes'),
    some = require('lodash/collection/some');

var BaseRenderer = require('diagram-js/lib/draw/BaseRenderer'),
    TextUtil = require('diagram-js/lib/util/Text'),
    DiUtil = require('../util/DiUtil');

var is = require('../util/ModelUtil').is;

var RenderUtil = require('diagram-js/lib/util/RenderUtil');

var componentsToPath = RenderUtil.componentsToPath,
    createLine = RenderUtil.createLine,
    createCurve = RenderUtil.createCurve,
    updateCurve = RenderUtil.updateCurve;
    

var TASK_BORDER_RADIUS = 10;
var COLLABORATION_BORDER_RADIUS = 0;
var INNER_OUTER_DIST = 3;

var LABEL_STYLE = {
  fontFamily: 'Arial, sans-serif',
  fontSize: '12px'
};


function VdmlRenderer(eventBus, styles, pathMap, priority) {

  BaseRenderer.call(this, eventBus, priority);

  var textUtil = new TextUtil({
    style: LABEL_STYLE,
    size: { width: 100 }
  });

  var markers = {};

  var computeStyle = styles.computeStyle;

  function addMarker(id, element) {
    markers[id] = element;
  }

  function marker(id) {
    return markers[id];
  }

  function initMarkers(svg) {

    function createMarker(id, options) {
      var attrs = assign({
        fill: 'black',
        strokeWidth: 1,
        strokeLinecap: 'round',
        strokeDasharray: 'none'
      }, options.attrs);

      var ref = options.ref || { x: 0, y: 0 };

      var scale = options.scale || 1;

      // fix for safari / chrome / firefox bug not correctly
      // resetting stroke dash array
      if (attrs.strokeDasharray === 'none') {
        attrs.strokeDasharray = [10000, 1];
      }

      var marker = options.element
                     .attr(attrs)
                     .marker(0, 0, 20, 20, ref.x, ref.y)
                     .attr({
                       markerWidth: 20 * scale,
                       markerHeight: 20 * scale
                     });

      return addMarker(id, marker);
    }


    createMarker('sequenceflow-end', {
      element: svg.path('M 1 5 L 11 10 L 1 15 Z'),
      ref: { x: 11, y: 10 },
      scale: 0.5
    });

    createMarker('messageflow-start', {
      element: svg.circle(6, 6, 3.5),
      attrs: {
        fill: 'white',
        stroke: 'black'
      },
      ref: { x: 6, y: 6 }
    });

    createMarker('messageflow-end', {
      element: svg.path('m 1 5 l 0 -3 l 7 3 l -7 3 z'),
      attrs: {
        fill: 'white',
        stroke: 'black',
        strokeLinecap: 'butt'
      },
      ref: { x: 8.5, y: 5 }
    });

    createMarker('association-start', {
      element: svg.path('M 11 5 L 1 10 L 11 15'),
      attrs: {
        fill: 'none',
        stroke: 'black',
        strokeWidth: 1.5
      },
      ref: { x: 1, y: 10 },
      scale: 0.5
    });

    createMarker('association-end', {
      element: svg.path('M 1 5 L 11 10 L 1 15'),
      attrs: {
        fill: 'none',
        stroke: 'black',
        strokeWidth: 1.5
      },
      ref: { x: 12, y: 10 },
      scale: 0.5
    });

    createMarker('conditional-flow-marker', {
      element: svg.path('M 0 10 L 8 6 L 16 10 L 8 14 Z'),
      attrs: {
        fill: 'white',
        stroke: 'black'
      },
      ref: { x: -1, y: 10 },
      scale: 0.5
    });

    createMarker('conditional-default-flow-marker', {
      element: svg.path('M 1 4 L 5 16'),
      attrs: {
        stroke: 'black'
      },
      ref: { x: -5, y: 10 },
      scale: 0.5
    });
  }
  function drawMargetSegment(p, element, attrs) {
      var rect = renderer('vdml:Collaboration')(p, element, attrs);
      attrs = computeStyle(attrs, {
          stroke: 'black',
          strokeWidth: 2,
          fill: 'white'
      });
      var r = element.height > element.width ? element.width / 20 : element.height / 20;
      var cx = element.width / 4,
          cy = element.height / 4;
      p.circle(cx, cy, Math.round(r)).attr(attrs);
      cx = cx -2*r;
      cy = cy + 2 * r;
      p.circle(cx, cy, Math.round(r)).attr(attrs);
      cx = cx + 4 * r;
      p.circle(cx, cy, Math.round(r)).attr(attrs);
      return rect;
  }
  function drawEnterprise(p, element, attrs) {
      var rect = renderer('vdml:Collaboration')(p, element, attrs);
      attrs = computeStyle(attrs, {
          stroke: 'black',
          strokeWidth: 2,
          fill: 'white'
      });
      var ouwidth = element.height > element.width ? element.width / 10 : element.height / 10;
      var startx = element.width / 4;
      var starty = element.height / 4;

      var waypoints = [{ x: startx, y: starty}, { x: startx, y: starty + element.height/10 }];
      drawLine(p, waypoints, attrs);
      startx = startx - ouwidth;
      starty = starty + element.height / 10;

      var waypoints = [{ x: startx , y: starty }, { x: startx + 2* ouwidth, y: starty }];
      drawLine(p, waypoints, attrs);

      var waypoints = [{ x: startx, y: starty }, { x: startx, y: starty + ouwidth}];
      drawLine(p, waypoints, attrs);
      startx = startx + 2 * ouwidth;
      var waypoints = [{ x: startx, y: starty }, { x: startx, y: starty + ouwidth }];
      drawLine(p, waypoints, attrs);

      return rect;
  }
  function drawPerson(p, width, height, offset, attrs) {

      if (isObject(offset)) {
          attrs = offset;
          offset = 0;
      }

      offset = offset || 0;

      attrs = computeStyle(attrs, {
          stroke: 'black',
          strokeWidth: 0,
          fill: 'white'
      });

      var r = height > width ? height/8 : width/8;
      var cx = width / 2,
          cy = r;

      var outer = drawRect(p, width, height, COLLABORATION_BORDER_RADIUS, attrs);
      attrs.strokeWidth = 2;
      p.circle(cx, cy, Math.round(r - offset)).attr(attrs);

      var waypoints = [{ x: width / 3, y: (2 * r + height) / 2 }, { x: 2 * width / 3, y: (2 * r + height) / 2 }];
      drawLine(p, waypoints, attrs);
      waypoints = [{ x: width / 2, y: 2* r }, { x: width / 2, y: height}];;
      drawLine(p, waypoints, attrs);
      return outer;
  }
  function drawCircle(p, width, height, offset, attrs) {

    if (isObject(offset)) {
      attrs = offset;
      offset = 0;
    }

    offset = offset || 0;

    attrs = computeStyle(attrs, {
      stroke: 'black',
      strokeWidth: 2,
      fill: 'white'
    });

    var cx = width / 2,
        cy = height / 2;

    return p.circle(cx, cy, Math.round((width + height) / 4 - offset)).attr(attrs);
  }

  function drawOval(p, width, height, offset, attrs) {

      if (isObject(offset)) {
          attrs = offset;
          offset = 0;
      }

      offset = offset || 0;

      attrs = computeStyle(attrs, {
          stroke: 'black',
          strokeWidth: 2,
          fill: 'white'
      });

      var cx = width / 2,
          cy = height / 2;

      return p.ellipse(cx, cy, Math.round((width) / 2 - offset), Math.round((height) / 2 - offset)).attr(attrs);
  }
  function drawRect(p, width, height, r, offset, attrs) {

    if (isObject(offset)) {
      attrs = offset;
      offset = 0;
    }

    offset = offset || 0;

    attrs = computeStyle(attrs, {
      stroke: 'black',
      strokeWidth: 2,
      fill: 'white'
    });

    return p.rect(offset, offset, width - offset * 2, height - offset * 2, r).attr(attrs);
  }

  function drawDiamond(p, width, height, attrs) {

    var x_2 = width / 2;
    var y_2 = height / 2;

    var points = [x_2, 0, width, y_2, x_2, height, 0, y_2 ];

    attrs = computeStyle(attrs, {
      stroke: 'black',
      strokeWidth: 2,
      fill: 'white'
    });

    return p.polygon(points).attr(attrs);
  }

  function drawHexagon(p, width, height, attrs) {

      var r = Math.round(height/2);
      var points = [];
      for (var i = 0; i < 6; i++) {
          points.push(width/2 + r * Math.cos(2 * Math.PI * i / 6));
          points.push(height/2 + r * Math.sin(2 * Math.PI * i / 6));
      }

      attrs = computeStyle(attrs, {
          stroke: 'black',
          strokeWidth: 2,
          fill: 'white'
      });

      return p.polygon(points).attr(attrs);
  }

  function drawLine(p, waypoints, attrs) {
    attrs = computeStyle(attrs, [ 'no-fill' ], {
      stroke: 'black',
      strokeWidth: 2,
      fill: 'none'
    });

    return createLine(waypoints, attrs).appendTo(p);
  }

  function drawPath(p, d, attrs) {

    attrs = computeStyle(attrs, [ 'no-fill' ], {
      strokeWidth: 2,
      stroke: 'black'
    });

    return p.path(d).attr(attrs);
  }

  function drawMarker(type, p, path, attrs) {
    return drawPath(p, path, assign({ 'data-marker': type }, attrs));
  }

  function as(type) {
    return function(p, element) {
      return handlers[type](p, element);
    };
  }

  function renderer(type) {
    return handlers[type];
  }

  function renderEventContent(element, p) {

    var event = getSemantic(element);
    var isThrowing = isThrowEvent(event);

    if (isTypedEvent(event, 'vdml:MessageEventDefinition')) {
      return renderer('vdml:MessageEventDefinition')(p, element, isThrowing);
    }

    if (isTypedEvent(event, 'vdml:TimerEventDefinition')) {
      return renderer('vdml:TimerEventDefinition')(p, element, isThrowing);
    }

    if (isTypedEvent(event, 'vdml:ConditionalEventDefinition')) {
      return renderer('vdml:ConditionalEventDefinition')(p, element);
    }

    if (isTypedEvent(event, 'vdml:SignalEventDefinition')) {
      return renderer('vdml:SignalEventDefinition')(p, element, isThrowing);
    }

    if (isTypedEvent(event, 'vdml:CancelEventDefinition') &&
      isTypedEvent(event, 'vdml:TerminateEventDefinition', { parallelMultiple: false })) {
      return renderer('vdml:MultipleEventDefinition')(p, element, isThrowing);
    }

    if (isTypedEvent(event, 'vdml:CancelEventDefinition') &&
      isTypedEvent(event, 'vdml:TerminateEventDefinition', { parallelMultiple: true })) {
      return renderer('vdml:ParallelMultipleEventDefinition')(p, element, isThrowing);
    }

    if (isTypedEvent(event, 'vdml:EscalationEventDefinition')) {
      return renderer('vdml:EscalationEventDefinition')(p, element, isThrowing);
    }

    if (isTypedEvent(event, 'vdml:LinkEventDefinition')) {
      return renderer('vdml:LinkEventDefinition')(p, element, isThrowing);
    }

    if (isTypedEvent(event, 'vdml:ErrorEventDefinition')) {
      return renderer('vdml:ErrorEventDefinition')(p, element, isThrowing);
    }

    if (isTypedEvent(event, 'vdml:CancelEventDefinition')) {
      return renderer('vdml:CancelEventDefinition')(p, element, isThrowing);
    }

    if (isTypedEvent(event, 'vdml:CompensateEventDefinition')) {
      return renderer('vdml:CompensateEventDefinition')(p, element, isThrowing);
    }

    if (isTypedEvent(event, 'vdml:TerminateEventDefinition')) {
      return renderer('vdml:TerminateEventDefinition')(p, element, isThrowing);
    }

    return null;
  }

  function renderLabel(p, label, options) {
    return textUtil.createText(p, label || '', options).addClass('djs-label');
  }

  function renderEmbeddedLabel(p, element, align) {
    var semantic = getSemantic(element);
    return renderLabel(p, semantic.name, { box: element, align: align, padding: 5 });
  }

  function renderExternalLabel(p, element) {
    var semantic = getSemantic(element);
    var box = {
      width: 90,
      height: 30,
      x: element.width / 2 + element.x,
      y: element.height / 2 + element.y
    };

    return renderLabel(p, semantic.name, { box: box, style: { fontSize: '11px' } });
  }

  function renderLaneLabel(p, text, element) {
    var textBox = renderLabel(p, text, {
      box: { height: 30, width: element.height },
      align: 'center-middle'
    });

    var top = -1 * element.height;
    textBox.transform(
      'rotate(270) ' +
      'translate(' + top + ',' + 0 + ')'
    );
  }
  function isCurvedConnection(connection) {
      if(is(connection, 'vdml:SequenceFlow')){
      //if (connection.type === 'vdml:SequenceFlow') {
          return true;
      }
      return false;
  }
  function createPathFromConnection(connection) {
    var isCurve = isCurvedConnection(connection);
    var waypoints = connection.waypoints;
    
    var pathData = 'm  ' + waypoints[0].x + ',' + waypoints[0].y;
    if (!isCurve) {
        for (var i = 1; i < waypoints.length; i++) {
            pathData += 'L' + waypoints[i].x + ',' + waypoints[i].y + ' ';
        }
    } else {
        if (waypoints.length >= 3) {
            pathData += ' Q' + waypoints[1].x + ',' + waypoints[1].y;
            pathData += ' ' + waypoints[2].x + ',' + waypoints[2].y;
        }
        for (var i = 3, p; (p = waypoints[i]) ; i++) {
            pathData += ' T' + waypoints[i].x + ',' + waypoints[i].y;
        }
    }
    return pathData;
  }

  var handlers = this.handlers = {
    'vdml:Activity': function(p, element, attrs) {
      return drawRect(p, element.width, element.height, TASK_BORDER_RADIUS, attrs);
    },

    'vdml:Collaboration': function(p, element, attrs) {
      var rect = drawRect(p, element.width, element.height, COLLABORATION_BORDER_RADIUS, attrs);
      renderEmbeddedLabel(p, element, 'center-middle');
      
      return rect;
    },
    'vdml:MarketSegment': function (p, element, attrs) {
        //var rect = renderer('vdml:Collaboration')(p, element, attrs);
        var rect = drawMargetSegment(p, element, attrs);
        return rect;
    },
    'vdml:Enterprise': function (p, element, attrs) {
        //var rect = renderer('vdml:Collaboration')(p, element, attrs);
        var rect = drawEnterprise(p, element, attrs);
        return rect;
    },
    'vdml:Individual': function (p, element, attrs) {
        var rect = drawPerson(p, element.width, element.height, COLLABORATION_BORDER_RADIUS, attrs);
        renderEmbeddedLabel(p, element, 'center-bottom');//works with update to diagram.js text util
        //renderEmbeddedLabel(p, element, 'center-middle');
        return rect;
    },
    'vdml:Role': function (p, element, attrs) {
        var oval = drawOval(p, element.width, element.height, attrs);
        renderEmbeddedLabel(p, element, 'center-middle');
        
        //var rect = renderer('vdml:Collaboration')(p, element, attrs);
        return oval;
    },
    'vdml:BusinessModel': function (p, element, attrs) {
        var hexagon = drawHexagon(p, element.width, element.height);
        renderEmbeddedLabel(p, element, 'center-middle');
        return hexagon;
    },
    'vdml:Participant': function(p, element) {

      var lane = renderer('vdml:Lane')(p, element, {
        fillOpacity: 0.95,
        fill: 'White'
      });

      var expandedPool = DiUtil.isExpanded(element);

      if (expandedPool) {
        drawLine(p, [
          { x: 30, y: 0 },
          { x: 30, y: element.height }
        ]);
        var text = getSemantic(element).name;
        renderLaneLabel(p, text, element);
      } else {
        // Collapsed pool draw text inline
        var text2 = getSemantic(element).name;
        renderLabel(p, text2, { box: element, align: 'center-middle' });
      }

      var participantMultiplicity = !!(getSemantic(element).participantMultiplicity);

      if (participantMultiplicity) {
        renderer('ParticipantMultiplicityMarker')(p, element);
      }

      return lane;
    },
    'vdml:Lane': function(p, element, attrs) {
      var rect = drawRect(p, element.width, element.height, 0, attrs || {
        fill: 'none'
      });

      var semantic = getSemantic(element);

      if (semantic.$type === 'vdml:Lane') {
        var text = semantic.name;
        renderLaneLabel(p, text, element);
      }

      return rect;
    },
    'vdml:ValueProposition': function(p, element) {
      var pathData = createPathFromConnection(element);
      var path = drawPath(p, pathData, {
        strokeLinejoin: 'round',
        markerEnd: marker('sequenceflow-end')
      });

      var sequenceFlow = getSemantic(element);
      var source = element.source.businessObject;

      // conditional flow marker
      if (sequenceFlow.conditionExpression && source.$instanceOf('vdml:Activity')) {
        path.attr({
          markerStart: marker('conditional-flow-marker')
        });
      }

      // default marker
      if (source.default && (source.$instanceOf('vdml:Gateway') || source.$instanceOf('vdml:Activity')) &&
          source.default === sequenceFlow) {
        path.attr({
          markerStart: marker('conditional-default-flow-marker')
        });
      }

      return path;
    },
    'vdml:Association': function (p, element, attrs) {

        var semantic = getSemantic(element);

        attrs = assign({
            strokeDasharray: '0.5, 5',
            strokeLinecap: 'round',
            strokeLinejoin: 'round'
        }, attrs || {});

        if (semantic.associationDirection === 'One' ||
            semantic.associationDirection === 'Both') {
            attrs.markerEnd = marker('association-end');
        }

        if (semantic.associationDirection === 'Both') {
            attrs.markerStart = marker('association-start');
        }

        return drawLine(p, element.waypoints, attrs);
    },
    'vdml:Group': function(p, element) {
      return drawRect(p, element.width, element.height, TASK_BORDER_RADIUS, {
        strokeWidth: 1,
        strokeDasharray: '8,3,1,3',
        fill: 'none',
        pointerEvents: 'none'
      });
    },
    'label': function(p, element) {
      // Update external label size and bounds during rendering when
      // we have the actual rendered bounds anyway.

      var textElement = renderExternalLabel(p, element);

      var textBBox = textElement.getBBox();

      // update element.x so that the layouted text is still
      // center alligned (newX = oldMidX - newWidth / 2)
      element.x = Math.ceil(element.x + element.width / 2) - Math.ceil((textBBox.width / 2));

      // take element width, height from actual bounds
      element.width = Math.ceil(textBBox.width);
      element.height = Math.ceil(textBBox.height);

      // compensate bounding box x
      textElement.attr({
        transform: 'translate(' + (-1 * textBBox.x) + ',0)'
      });

      return textElement;
    },
    'vdml:TextAnnotation': function(p, element) {
      var style = {
        'fill': 'none',
        'stroke': 'none'
      };
      var textElement = drawRect(p, element.width, element.height, 0, 0, style);
      var textPathData = pathMap.getScaledPath('TEXT_ANNOTATION', {
        xScaleFactor: 1,
        yScaleFactor: 1,
        containerWidth: element.width,
        containerHeight: element.height,
        position: {
          mx: 0.0,
          my: 0.0
        }
      });
      drawPath(p, textPathData);

      var text = getSemantic(element).text || '';
      renderLabel(p, text, { box: element, align: 'left-middle', padding: 5 });

      return textElement;
    }

  };

  function attachTaskMarkers(p, element, taskMarkers) {
    var obj = getSemantic(element);

    var subprocess = includes(taskMarkers, 'SubProcessMarker');
    var position;

    if (subprocess) {
      position = {
        seq: -21,
        parallel: -22,
        compensation: -42,
        loop: -18,
        adhoc: 10
      };
    } else {
      position = {
        seq: -3,
        parallel: -6,
        compensation: -27,
        loop: 0,
        adhoc: 10
      };
    }

    forEach(taskMarkers, function(marker) {
      renderer(marker)(p, element, position);
    });

    if (obj.isForCompensation) {
      renderer('CompensationMarker')(p, element, position);
    }

    if (obj.$type === 'vdml:AdHocSubProcess') {
      renderer('AdhocMarker')(p, element, position);
    }

    var loopCharacteristics = obj.loopCharacteristics,
        isSequential = loopCharacteristics && loopCharacteristics.isSequential;

    if (loopCharacteristics) {

      if (isSequential === undefined) {
        renderer('LoopMarker')(p, element, position);
      }

      if (isSequential === false) {
        renderer('ParallelMarker')(p, element, position);
      }

      if (isSequential === true) {
        renderer('SequentialMarker')(p, element, position);
      }
    }
  }

  function renderDataItemCollection(p, element) {

    var yPosition = (element.height - 16) / element.height;

    var pathData = pathMap.getScaledPath('DATA_OBJECT_COLLECTION_PATH', {
      xScaleFactor: 1,
      yScaleFactor: 1,
      containerWidth: element.width,
      containerHeight: element.height,
      position: {
        mx: 0.451,
        my: yPosition
      }
    });

    /* collection path */ drawPath(p, pathData, {
      strokeWidth: 2
    });
  }

  // hook onto canvas init event to initialize
  // connection start/end markers on svg
  eventBus.on('canvas.init', function(event) {
    initMarkers(event.svg);
  });
}


inherits(VdmlRenderer, BaseRenderer);

VdmlRenderer.$inject = [ 'eventBus', 'styles', 'pathMap' ];

module.exports = VdmlRenderer;


VdmlRenderer.prototype.canRender = function(element) {
  return is(element, 'vdml:BaseElement');
};

VdmlRenderer.prototype.drawShape = function(visuals, element) {
  var type = element.type;
  var h = this.handlers[type];

  /* jshint -W040 */
  return h(visuals, element);
};

VdmlRenderer.prototype.drawConnection = function(visuals, element) {
  var type = element.type;
  var h = this.handlers[type];

  /* jshint -W040 */
  return h(visuals, element);
};

VdmlRenderer.prototype.getShapePath = function(element) {

  if (is(element, 'vdml:Role')) {
    return getOvalPath(element);
  }
/*  if (is(element, 'vdml:BusinessModel')) {
      return getHexagonePath(element);
  }
  if (is(element, 'vdml:Individual')) {
      return getPersonPath(element);
  }*/
  if (is(element, 'vdml:MarketSegment') || is(element, 'vdml:Enterprise')) {
    return getRoundRectPath(element, TASK_BORDER_RADIUS);
  }

  return getRectPath(element);
};



///////// helper functions /////////////////////////////

/**
 * Checks if eventDefinition of the given element matches with semantic type.
 *
 * @return {boolean} true if element is of the given semantic type
 */
function isTypedEvent(event, eventDefinitionType, filter) {

  function matches(definition, filter) {
    return every(filter, function(val, key) {

      // we want a == conversion here, to be able to catch
      // undefined == false and friends
      /* jshint -W116 */
      return definition[key] == val;
    });
  }

  return some(event.eventDefinitions, function(definition) {
    return definition.$type === eventDefinitionType && matches(event, filter);
  });
}

function isThrowEvent(event) {
  return (event.$type === 'vdml:IntermediateThrowEvent') || (event.$type === 'vdml:EndEvent');
}

function isCollection(element) {
  return element.isCollection ||
        (element.elementObjectRef && element.elementObjectRef.isCollection);
}

function getDi(element) {
  return element.businessObject.di;
}

function getSemantic(element) {
  return element.businessObject;
}



/////// cropping path customizations /////////////////////////

function getCirclePath(shape) {

  var cx = shape.x + shape.width / 2,
      cy = shape.y + shape.height / 2,
      radius = shape.width / 2;

  var circlePath = [
    ['M', cx, cy],
    ['m', 0, -radius],
    ['a', radius, radius, 0, 1, 1, 0, 2 * radius],
    ['a', radius, radius, 0, 1, 1, 0, -2 * radius],
    ['z']
  ];

  return componentsToPath(circlePath);
}


function getOvalPath(shape) {
    var cx = shape.x + shape.width / 2,
        cy = shape.y + shape.height / 2,
        rx = shape.width / 2,
        ry = shape.height / 2;
    var circlePath = [
        ['M', cx - rx, cy],
        ['a', rx, ry, 0, 1, 0, 2 * rx, 0],
        ['a', rx, ry, 0, 1, 0, -2 * rx, 0]
    ];
    return componentsToPath(circlePath);
}
// done hiding from old browsers -->

function getRoundRectPath(shape, borderRadius) {

  var x = shape.x,
      y = shape.y,
      width = shape.width,
      height = shape.height;

  var roundRectPath = [
    ['M', x + borderRadius, y],
    ['l', width - borderRadius * 2, 0],
    ['a', borderRadius, borderRadius, 0, 0, 1, borderRadius, borderRadius],
    ['l', 0, height - borderRadius * 2],
    ['a', borderRadius, borderRadius, 0, 0, 1, -borderRadius, borderRadius],
    ['l', borderRadius * 2 - width, 0],
    ['a', borderRadius, borderRadius, 0, 0, 1, -borderRadius, -borderRadius],
    ['l', 0, borderRadius * 2 - height],
    ['a', borderRadius, borderRadius, 0, 0, 1, borderRadius, -borderRadius],
    ['z']
  ];

  return componentsToPath(roundRectPath);
}

function getDiamondPath(shape) {

  var width = shape.width,
      height = shape.height,
      x = shape.x,
      y = shape.y,
      halfWidth = width / 2,
      halfHeight = height / 2;

  var diamondPath = [
    ['M', x + halfWidth, y],
    ['l', halfWidth, halfHeight],
    ['l', -halfWidth, halfHeight],
    ['l', -halfWidth, -halfHeight],
    ['z']
  ];

  return componentsToPath(diamondPath);
}

function getRectPath(shape) {
  var x = shape.x,
      y = shape.y,
      width = shape.width,
      height = shape.height;

  var rectPath = [
    ['M', x, y],
    ['l', width, 0],
    ['l', 0, height],
    ['l', -width, 0],
    ['z']
  ];

  return componentsToPath(rectPath);
}
function getHexagonePath(shape) {
    var r = Math.round(shape.width / 2);
    var points = [];
    for (var i = 0; i < 6; i++) {
        points.push(shape.width / 2 + r * Math.cos(2 * Math.PI * i / 6));
        points.push(shape.height / 2 + r * Math.sin(2 * Math.PI * i / 6));
    }
    var hexPath = [
      
    ];
    hexPath.push(['M', points[0], points[1]]);
    for (var i = 1; i < 6; i++) {
        hexPath.push(['l', points[i * 2], points[i * 2 + 1]]);
    }
    hexPath.push(['z']);
    return componentsToPath(hexPath);;
}
