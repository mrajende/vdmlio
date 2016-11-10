module.exports = {
  __depends__: [
    require('diagram-js/lib/features/search-pad')
  ],
  __init__: [ 'vdmlSearch'],
  vdmlSearch: [ 'type', require('./VdmlSearchProvider') ]
};
