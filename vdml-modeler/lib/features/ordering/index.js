module.exports = {
  __init__: [ 'vdmlOrderingProvider' ],
  __depends__: [
    require('diagram-js/lib/i18n/translate')
  ],
  vdmlOrderingProvider: [ 'type', require('./VdmlOrderingProvider') ]
};