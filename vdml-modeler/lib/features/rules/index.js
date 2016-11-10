module.exports = {
  __depends__: [
    require('diagram-js/lib/features/rules')
  ],
  __init__: [ 'vdmlRules' ],
  vdmlRules: [ 'type', require('./VdmlRules') ]
};
