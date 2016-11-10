module.exports = {
  __depends__: [
    require('diagram-js/lib/i18n/translate')
  ],
  vdmlImporter: [ 'type', require('./VdmlImporter') ]
};