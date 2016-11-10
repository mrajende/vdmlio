module.exports = {
  __depends__: [
    require('diagram-js/lib/features/keyboard')
  ],
  __init__: [ 'vdmlKeyBindings' ],
  vdmlKeyBindings: [ 'type', require('./VdmlKeyBindings') ]
};
