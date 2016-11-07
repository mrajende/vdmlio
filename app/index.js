'use strict';

// we use $.ajax to load the diagram.
// make sure you run the application via web-server (ie. connect (node) or asdf (ruby))

// require the viewer, make sure you added the bpmn-js bower distribution
// along with all its dependencies to the web site
var BpmnModeler = window.VdmlJS;

//var fs = require('fs');
var container = $('#js-canvas')
var modeler;


var newDiagramXML = "<?xml version=\"1.0\" encoding=\"UTF-8\"?>\n<bpmn2:definitions xmlns:xsi=\"http://www.w3.org/2001/XMLSchema-instance\" xmlns:bpmn2=\"http://www.omg.org/spec/BPMN/20100524/MODEL\" xmlns:bpmndi=\"http://www.omg.org/spec/BPMN/20100524/DI\" xmlns:dc=\"http://www.omg.org/spec/DD/20100524/DC\" xmlns:di=\"http://www.omg.org/spec/DD/20100524/DI\" xsi:schemaLocation=\"http://www.omg.org/spec/BPMN/20100524/MODEL BPMN20.xsd\" id=\"sample-diagram\" targetNamespace=\"http://bpmn.io/schema/bpmn\">\n  <bpmn2:process id=\"Process_1\" isExecutable=\"false\">\n    <bpmn2:startEvent id=\"StartEvent_1\"/>\n  </bpmn2:process>\n  <bpmndi:BPMNDiagram id=\"BPMNDiagram_1\">\n    <bpmndi:BPMNPlane id=\"BPMNPlane_1\" bpmnElement=\"Process_1\">\n      <bpmndi:BPMNShape id=\"_BPMNShape_StartEvent_2\" bpmnElement=\"StartEvent_1\">\n        <dc:Bounds height=\"36.0\" width=\"36.0\" x=\"412.0\" y=\"240.0\"/>\n      </bpmndi:BPMNShape>\n    </bpmndi:BPMNPlane>\n  </bpmndi:BPMNDiagram>\n</bpmn2:definitions>";

function createNewDiagram() {
    modeler = new BpmnModeler({ container: container });
    openDiagram(newDiagramXML);
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

