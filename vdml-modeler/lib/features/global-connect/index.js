module.exports = {
  __depends__: [
    require('diagram-js/lib/features/global-connect')
  ],
  __init__: [ 'vdmlGlobalConnect' ],
  vdmlGlobalConnect: [ 'type', require('./VdmlGlobalConnect') ]
};
