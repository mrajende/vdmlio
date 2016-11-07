'use strict';

// we use $.ajax to load the diagram.
// make sure you run the application via web-server (ie. connect (node) or asdf (ruby))

// require the viewer, make sure you added the vdml-js bower distribution
// along with all its dependencies to the web site
var VdmlViewer = window.VdmlJS;

var viewer = new VdmlViewer({ container: '#canvas' });

var xhr = new XMLHttpRequest();

xhr.onreadystatechange = function() {
    if (xhr.readyState === 4) {
        viewer.importXML(xhr.response, function(err) {

          if (!err) {
            console.log('success!');
            viewer.get('canvas').zoom('fit-viewport');
          } else {
            console.log('something went wrong:', err);
          }
        });
    }
};

xhr.open('GET', '../resources/pizza-collaboration.vdml', true);
xhr.send(null);
