module.exports = {
  __depends__: [ require('diagram-js/lib/features/preview-support') ],
  __init__: [ 'vdmlReplacePreview' ],
  vdmlReplacePreview: [ 'type', require('./VdmlReplacePreview') ]
};
