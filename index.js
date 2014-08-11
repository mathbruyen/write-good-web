'use strict';

var writeGood = require('write-good');
var source = document.getElementById('source');

var suggestions = document.getElementById('suggestions');
var list = document.createElement('ul');
suggestions.appendChild(list);

function removeChildren(element) {
  while (element.firstChild) {
    element.removeChild(element.firstChild);
  }
}

function onChange() {
  removeChildren(list);
  writeGood(source.value).forEach(function (suggestion) {
    var item = document.createElement('li');
    item.textContent = suggestion.index + ': ' + suggestion.reason + ' (' + suggestion.offset + ')';
    list.appendChild(item);
  });
}

source.addEventListener('input', onChange, false);
// trigger initial display if the browser retained something in the input
onChange();
