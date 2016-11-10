module.exports = {
  __init__: [ 'modeling', 'vdmlUpdater' ],
  __depends__: [
    require('./behavior'),
    require('../label-editing'),
    require('../rules'),
    require('../ordering'),
    require('../replace'),
    require('diagram-js/lib/command'),
    require('diagram-js/lib/features/tooltips'),
    require('diagram-js/lib/features/label-support'),
    require('diagram-js/lib/features/attach-support'),
    require('diagram-js/lib/features/selection'),
    require('diagram-js/lib/features/change-support'),
    require('diagram-js/lib/features/space-tool')
  ],
  vdmlFactory: [ 'type', require('./VdmlFactory') ],
  vdmlUpdater: [ 'type', require('./VdmlUpdater') ],
  elementFactory: [ 'type', require('./ElementFactory') ],
  modeling: [ 'type', require('./Modeling') ],
  layouter: [ 'type', require('./VdmlLayouter') ],
  connectionDocking: [ 'type', require('diagram-js/lib/layout/CroppingConnectionDocking') ]
};
