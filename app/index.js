'use strict';

// we use $.ajax to load the diagram.
// make sure you run the application via web-server (ie. connect (node) or asdf (ruby))

// require the viewer, make sure you added the vdml-js bower distribution
// along with all its dependencies to the web site
var VdmlModeler = window.VdmlJS;
debugger;
//var fs = require('fs');
var container = $('#js-canvas')
var properties = $('#js-properties');
var modeler;


//var newDiagramXML = "<?xml version=\"1.0\" encoding=\"UTF-8\"?>\n<vdml2:definitions xmlns:xsi=\"http://www.w3.org/2001/XMLSchema-instance\" xmlns:vdml2=\"http://www.omg.org/spec/VDML/20100524/MODEL\" xmlns:vdmldi=\"http://www.omg.org/spec/VDML/20100524/DI\" xmlns:dc=\"http://www.omg.org/spec/DD/20100524/DC\" xmlns:di=\"http://www.omg.org/spec/DD/20100524/DI\" xsi:schemaLocation=\"http://www.omg.org/spec/VDML/20100524/MODEL VDML20.xsd\" id=\"sample-diagram\" targetNamespace=\"http://vdml.io/schema/vdml\">\n  <vdml2:process id=\"Process_1\" isExecutable=\"false\">\n    <vdml2:startEvent id=\"StartEvent_1\"/>\n  </vdml2:process>\n  <vdmldi:VDMLDiagram id=\"VDMLDiagram_1\">\n    <vdmldi:VDMLPlane id=\"VDMLPlane_1\" vdmlElement=\"Process_1\">\n      <vdmldi:VDMLShape id=\"_VDMLShape_StartEvent_2\" vdmlElement=\"StartEvent_1\">\n        <dc:Bounds height=\"36.0\" width=\"36.0\" x=\"412.0\" y=\"240.0\"/>\n      </vdmldi:VDMLShape>\n    </vdmldi:VDMLPlane>\n  </vdmldi:VDMLDiagram>\n</vdml2:definitions>";
var newDiagramXML = "<?xml version=\"1.0\" encoding=\"UTF-8\"?>\n<vdml:definitions xmlns:xsi=\"http://www.w3.org/2001/XMLSchema-instance\" xmlns:vdml=\"http://www.omg.org/spec/VDML/20100524/MODEL\" xmlns:vdmldi=\"http://www.omg.org/spec/VDML/20100524/DI\" xmlns:dc=\"http://www.omg.org/spec/DD/20100524/DC\" xmlns:di=\"http://www.omg.org/spec/DD/20100524/DI\" xsi:schemaLocation=\"http://www.omg.org/spec/VDML/20100524/MODEL VDML.xsd\" id=\"sample-diagram\" targetNamespace=\"http://vdml.io/schema/vdml\">\n  <vdml:EcoMap id=\"Process_1\" >\n   </vdml:EcoMap>\n <vdmldi:VDMLDiagram id=\"VDMLDiagram_1\">\n    <vdmldi:VDMLPlane id=\"VDMLPlane_1\" vdmlElement=\"Process_1\">\n </vdmldi:VDMLPlane>\n  </vdmldi:VDMLDiagram>\n</vdml:definitions>";

function createNewDiagram() {
    modeler = new VdmlModeler({
        keyboard: { bindTo: document },
        container: container,
        propertiesPanel: {
            parent: '#js-properties'
        }
    });
    var xhr = new XMLHttpRequest();

    xhr.onreadystatechange = function () {
        if (xhr.readyState === 4) {
            openDiagram(xhr.response);
        }
    };

    xhr.open('GET', '../resources/ecomap.vdml', true);
    xhr.send(null);

    //openDiagram(newDiagramXML);
}

function openDiagram(xml) {

    modeler.importXML(xml, function (err) {

        if (err) {
            container
              .removeClass('with-diagram')
              .addClass('with-error');

            container.find('.error pre').text(err.message);

            console.error(err);
        } else {
            $('.message').hide();
            container
              .removeClass('with-error')
              .addClass('with-diagram')
              .css('visibility','visible');

        }


    });
}

function saveSVG(done) {
    modeler.saveSVG(done);
}

function saveDiagram(done) {

    modeler.saveXML({ format: true }, function (err, xml) {
        done(err, xml);
    });
}

function registerFileDrop(container, callback) {

    function handleFileSelect(e) {
        e.stopPropagation();
        e.preventDefault();

        var files = e.dataTransfer.files;

        var file = files[0];

        var reader = new FileReader();

        reader.onload = function (e) {

            var xml = e.target.result;

            callback(xml);
        };

        reader.readAsText(file);
    }

    function handleDragOver(e) {
        e.stopPropagation();
        e.preventDefault();

        e.dataTransfer.dropEffect = 'copy'; // Explicitly show this is a copy.
    }

    container.get(0).addEventListener('dragover', handleDragOver, false);
    container.get(0).addEventListener('drop', handleFileSelect, false);
}
$('#js-create-diagram').click(createNewDiagram);
function handleSaveDiagram() {
    saveDiagram(function (err, xml) {
        if(err) {
            console.log(err);
        }
        if (xml) {
            console.log(xml);
        }
    });
}
$('#js-download-diagram').click(handleSaveDiagram);
function handleSaveSVG() {
    saveSVG(function (err, xml) {
        if (err) {
            console.log(err);
        }
        if (xml) {
            console.log(xml);
        }
    });
}
$('#js-download-svg').click(handleSaveSVG);
$('#js-create-new-diagram').click(function () {
    openDiagram(newDiagramXML);
});
