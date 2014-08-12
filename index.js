'use strict';

var writeGood = require('write-good');
var source = document.getElementById('source');
var suggestions = document.getElementById('suggestions');

function removeChildren(element) {
  while (element.firstChild) {
    element.removeChild(element.firstChild);
  }
}

function isLeaf(node) {
  return !!node.comments;
}
function newLeaf(text, comments) {
  return { length : text.length, text : text, comments : comments || [] };
}
function newInnerNode(length, children) {
  return { length : length, children : children };
}
function splitLeaf(leaf, idx1, idx2, newComment) {
  var elements = [];

  // left part if any
  if (idx1 !== 0) {
    elements.push(newLeaf(leaf.text.substring(0, idx1), leaf.comments.slice(0)));
  }

  // middle part with new comment
  var middle = newLeaf(leaf.text.substring(idx1, idx2), leaf.comments.slice(0));
  middle.comments.push(newComment);
  elements.push(middle);

  // right part if any
  if (idx2 !== leaf.text.length) {
    elements.push(newLeaf(leaf.text.substring(idx2), leaf.comments.slice(0)));
  }

  // return middle part only if only one element
  if (elements.length === 1) {
    return elements[0];
  } else {
    return newInnerNode(leaf.length, elements);
  }
}
function splitInnerNode(node, suggestion) {
  var offset = 0;
  var elements = [];
  node.children.forEach(function (child) {
    if (suggestion.start < offset + child.length && offset < suggestion.end) {
      elements.push(splitNode(child, {
        reason : suggestion.reason,
        start : Math.max(0, suggestion.start - offset),
        end : Math.min(suggestion.end - offset, child.length)
      }));
    } else {
      elements.push(child);
    }
    offset += child.length;
  });
  return newInnerNode(node.length, elements);
}
function splitNode(node, suggestion) {
  if (isLeaf(node)) {
    return splitLeaf(node, suggestion.start, suggestion.end, suggestion.reason);
  } else {
    return splitInnerNode(node, suggestion);
  }
}
function flatten(node, array) {
  if (isLeaf(node)) {
    array.push(node);
  } else {
    node.children.forEach(function (child) {
      flatten(child, array);
    });
  }
  return array;
}
function toMarkup(leaf) {
  var span = document.createElement('span');
  span.textContent = leaf.text;
  if (leaf.comments.length > 0) {
    span.setAttribute('title', leaf.comments.join('\n'));
    span.classList.add('suggestion');
  }
  return span;
}
function convertSuggestion(s) {
  return { reason : s.reason, start : s.index, end : s.index + s.offset };
}

function onChange() {
  removeChildren(suggestions);
  var text = source.value;
  var s = writeGood(text).map(convertSuggestion);
  // suggestions are actually sorted so the tree data structure would be more efficient by first shuffling the array
  var textTree = s.reduce(splitNode, newLeaf(text));
  var tags = flatten(textTree, []).map(toMarkup);
  tags.forEach(suggestions.appendChild.bind(suggestions));
}

source.addEventListener('input', onChange, false);
// trigger initial display if the browser retained something in the input
onChange();
