module.exports = {
  __depends__: [
    require('diagram-js/lib/features/distribute-elements')
  ],
  __init__: [ 'vdmlDistributeElements' ],
  vdmlDistributeElements: [ 'type', require('./VdmlDistributeElements') ]
};
