'use strict';

var inherits = require('inherits');

var assign = require('lodash/object/assign');

var BaseLayouter = require('diagram-js/lib/layout/BaseLayouter'),
    ManhattanLayout = require('diagram-js/lib/layout/ManhattanLayout');

var LayoutUtil = require('diagram-js/lib/layout/LayoutUtil');

var isExpanded = require('../../util/DiUtil').isExpanded;

var getMid = LayoutUtil.getMid,
    getOrientation = LayoutUtil.getOrientation;

var is = require('../../util/ModelUtil').is;


function VdmlLayouter() {}

inherits(VdmlLayouter, BaseLayouter);

module.exports = VdmlLayouter;


VdmlLayouter.prototype.layoutConnection = function(connection, hints) {

  hints = hints || {};

  var source = connection.source,
      target = connection.target,
      waypoints = connection.waypoints,
      start = hints.connectionStart,
      end = hints.connectionEnd;

  var manhattanOptions,
      updatedWaypoints;

  if (!start) {
    start = getConnectionDocking(waypoints && waypoints[0], source);
  }

  if (!end) {
    end = getConnectionDocking(waypoints && waypoints[waypoints.length - 1], target);
  }

  // TODO(nikku): support vertical modeling
  // and invert preferredLayouts accordingly

  if (is(connection, 'vdml:Association') ||
      is(connection, 'vdml:DataAssociation')) {

    if (waypoints && !isCompensationAssociation(connection)) {
      return [].concat([ start ], waypoints.slice(1, -1), [ end ]);
    }
  }

  // manhattan layout sequence / message flows
  if (is(connection, 'vdml:MessageFlow')) {
    manhattanOptions = {
      preferredLayouts: [ 'v:v' ]
    };

    if (is(target, 'vdml:Participant')) {
      manhattanOptions = {
        preferredLayouts: [ 'straight', 'v:v' ]
      };
    }

    if (isExpandedSubProcess(target)) {
      manhattanOptions = {
        preferredLayouts: [ 'straight', 'v:v' ]
      };
    }

    if (isExpandedSubProcess(source) && is(target, 'vdml:FlowNode')) {
      manhattanOptions = {
        preferredLayouts: [ 'straight', 'v:v' ],
        preserveDocking: isExpandedSubProcess(target) ? 'source' : 'target'
      };
    }

    if (is(source, 'vdml:Participant') && is(target, 'vdml:FlowNode')) {
      manhattanOptions = {
        preferredLayouts: [ 'straight', 'v:v' ],
        preserveDocking: 'target'
      };
    }

    if (is(target, 'vdml:Event')) {
      manhattanOptions = {
        preferredLayouts: [ 'v:v' ]
      };
    }
  } else


  // layout all connection between flow elements h:h,
  //
  // except for
  //
  // (1) outgoing of BoundaryEvents -> layout h:v or v:h based on attach orientation
  // (2) incoming / outgoing of Gateway -> v:h (outgoing), h:v (incoming)
  //
  if (is(connection, 'vdml:SequenceFlow') ||
      isCompensationAssociation(connection)) {

    // make sure boundary event connections do
    // not look ugly =:>
    if (is(source, 'vdml:BoundaryEvent')) {

      var orientation = getAttachOrientation(source);

      if (/left|right/.test(orientation)) {
        manhattanOptions = {
          preferredLayouts: [ 'h:v' ]
        };
      } else

      if (/top|bottom/.test(orientation)) {
        manhattanOptions = {
          preferredLayouts: [ 'v:h' ]
        };
      }
    } else

    if (is(source, 'vdml:Gateway')) {

      manhattanOptions = {
        preferredLayouts: [ 'v:h' ]
      };
    } else

    if (is(target, 'vdml:Gateway')) {

      manhattanOptions = {
        preferredLayouts: [ 'h:v' ]
      };
    }

    // apply horizontal love <3
    else {
      manhattanOptions = {
        preferredLayouts: [ 'h:h' ]
      };
    }
  }

  if (manhattanOptions) {

    manhattanOptions = assign(manhattanOptions, hints);

    updatedWaypoints =
      ManhattanLayout.repairConnection(
        source, target,
        start, end,
        waypoints,
        manhattanOptions);
  }

  return updatedWaypoints || [ start, end ];
};


function getAttachOrientation(attachedElement) {

  var hostElement = attachedElement.host,
      padding = -10;

  return getOrientation(getMid(attachedElement), hostElement, padding);
}


function getConnectionDocking(point, shape) {
  return point ? (point.original || point) : getMid(shape);
}

function isCompensationAssociation(connection) {

  var source = connection.source,
      target = connection.target;

  return is(target, 'vdml:Activity') &&
         is(source, 'vdml:BoundaryEvent') &&
         target.businessObject.isForCompensation;
}


function isExpandedSubProcess(element) {
  return is(element, 'vdml:SubProcess') && isExpanded(element);
}