module.exports = {
  __depends__: [
    require('diagram-js/lib/features/copy-paste')
  ],
  __init__: [ 'vdmlCopyPaste' ],
  vdmlCopyPaste: [ 'type', require('./VdmlCopyPaste') ]
};
