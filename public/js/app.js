(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
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

},{"write-good":14}],2:[function(require,module,exports){

// annotate file contents with suggestions
module.exports = function (contents, suggestions) {

  var lines = contents.split('\n');

  return suggestions.map(function (suggestion) {
    var lineColumn = findLineColumn(suggestion.index);

    var fix = 0;

    if (lineColumn.col > 25) {
      fix = lineColumn.col - 25;
    }

    var lineSegment = lines[lineColumn.line - 1].substr(fix, 80);

    return [
      lineSegment,
      repeatChar(' ', lineColumn.col - fix) + repeatChar('^', suggestion.offset),
      suggestion.reason + ' on line ' + lineColumn.line + ' at column ' + lineColumn.col
    ].join('\n');
  })

  function findLineColumn (index) {
    var line = contents.substr(0, index).split('\n').length;


    var startOfLineIndex = (function () {
      var x = lines.slice(0);
      x.splice(line - 1);
      return x.join('\n').length + (x.length > 0);
    }());

    var col = index - startOfLineIndex;

    return {
      line: line,
      col: col
    };
  }
}

function repeatChar (ch, times) {
  var str = '';
  for (var i = times; i > 0; i--) {
    str += ch;
  }
  return str;
}

},{}],3:[function(require,module,exports){

// via http://matt.might.net/articles/shell-scripts-for-passive-voice-weasel-words-duplicates/

// Example:
// Many readers are not aware that the
// the brain will automatically ignore
// a second instance of the word "the"
// when it starts a new line.
var re = new RegExp('(\\s*)([^\\s]+)', 'gi');
var word = /\w+/;

module.exports = function (text) {
  var suggestions = [];
  var lastMatch = '';
  while (match = re.exec(text)) {
    if (word.test(match[2]) && match[2].toLowerCase() === lastMatch) {
      suggestions.push({
        index: match.index + match[1].length,
        offset: match[2].length
      });
    }
    lastMatch = match[2].toLowerCase();
  }
  return suggestions;
}

},{}],4:[function(require,module,exports){

// Opinion: I think it's gross to start written English independant clauses with "so"
//          most of the time. Maybe it's okay in spoken English.
//
// More on "so:"
// * http://www.nytimes.com/2010/05/22/us/22iht-currents.html?_r=0
// * http://comminfo.rutgers.edu/images/comprofiler/plug_profilegallery/84/pg_2103855866.pdf

// this implementation is really naive
var re = new RegExp('([^\\.;!?]+)([\\.;!?]+)', 'gi');
var startsWithSo = new RegExp('^(\\s)*so\\b[\\s\\S]', 'i');
module.exports = function (text) {
  var suggestions = [];
  var match, innerMatch;

  while (match = re.exec(text)) {
    if (innerMatch = startsWithSo.exec(match[1])) {
      suggestions.push({
        index: match.index + (innerMatch[1] || '').length,
        offset: 2
      });
    }
  }
  return suggestions;
};

},{}],5:[function(require,module,exports){

// Opinion: I think it's gross to start written English sentences with "there (is|are)"
//          (most of the time)

// this implementation is really naive
var re = new RegExp('([^\\.;!?]+)([\\.;!?]+)', 'gi');
var startsWithThereIs = new RegExp('^(\\s)*there\\b\\s(is|are)\\b', 'i');
module.exports = function (text) {
  var suggestions = [];
  var match, innerMatch;

  while (match = re.exec(text)) {
    if (innerMatch = startsWithThereIs.exec(match[1])) {
      suggestions.push({
        index: match.index + (innerMatch[1] || '').length,
        offset: innerMatch[0].length - (innerMatch[1] || '').length
      });
    }
  }
  return suggestions;
};

},{}],6:[function(require,module,exports){
var adverbs = [
  'absolutel',
  'accidentall',
  'additionall',
  'allegedl',
  'alternativel',
  'angril',
  'anxiousl',
  'approximatel',
  'awkwardl',
  'badl',
  'barel',
  'beautifull',
  'blindl',
  'boldl',
  'bravel',
  'brightl',
  'briskl',
  'bristl',
  'bubbl',
  'busil',
  'calml',
  'carefull',
  'carelessl',
  'cautiousl',
  'cheerfull',
  'clearl',
  'closel',
  'coldl',
  'completel',
  'consequentl',
  'correctl',
  'courageousl',
  'crinkl',
  'cruell',
  'crumbl',
  'cuddl',
  'currentl',
  'dail',
  'daringl',
  'deadl',
  'definitel',
  'deliberatel',
  'doubtfull',
  'dumbl',
  'eagerl',
  'earl',
  'easil',
  'elegantl',
  'enormousl',
  'enthusiasticall',
  'equall',
  'especiall',
  'eventuall',
  'exactl',
  'exceedingl',
  'exclusivel',
  'extremel',
  'fairl',
  'faithfull',
  'fatall',
  'fiercel',
  'finall',
  'fondl',
  'foolishl',
  'fortunatel',
  'frankl',
  'franticall',
  'generousl',
  'gentl',
  'giggl',
  'gladl',
  'gracefull',
  'greedil',
  'happil',
  'hardl',
  'hastil',
  'healthil',
  'heartil',
  'honestl',
  'hourl',
  'hungril',
  'hurriedl',
  'immediatel',
  'impatientl',
  'inadequatel',
  'ingeniousl',
  'innocentl',
  'inquisitivel',
  'interestingl',
  'irritabl',
  'jiggl',
  'joyousl',
  'justl',
  'kindl',
  'largel',
  'latel',
  'lazil',
  'likel',
  'literall',
  'lonel',
  'loosel',
  'loudl',
  'loudl',
  'luckil',
  'madl',
  'man',
  'mentall',
  'mildl',
  'monthl',
  'mortall',
  'mostl',
  'mysteriousl',
  'neatl',
  'nervousl',
  'nightl',
  'noisil',
  'obedientl',
  'occasionall',
  'onl',
  'openl',
  'painfull',
  'particularl',
  'patientl',
  'perfectl',
  'politel',
  'poorl',
  'powerfull',
  'presumabl',
  'previousl',
  'promptl',
  'punctuall',
  'quarterl',
  'quickl',
  'quietl',
  'rapidl',
  'rarel',
  'reall',
  'recentl',
  'recklessl',
  'regularl',
  'relativel',
  'reluctantl',
  'remarkabl',
  'repeatedl',
  'rightfull',
  'roughl',
  'rudel',
  'sadl',
  'safel',
  'selfishl',
  'sensibl',
  'seriousl',
  'sharpl',
  'shortl',
  'shyl',
  'significantl',
  'silentl',
  'simpl',
  'sleepil',
  'slowl',
  'smartl',
  'smell',
  'smoothl',
  'softl',
  'solemnl',
  'sparkl',
  'speedil',
  'stealthil',
  'sternl',
  'stupidl',
  'substantiall',
  'successfull',
  'suddenl',
  'surprisingl',
  'suspiciousl',
  'swiftl',
  'tenderl',
  'tensel',
  'thoughtfull',
  'tightl',
  'timel',
  'truthfull',
  'unexpectedl',
  'unfortunatel',
  'usuall',
  'ver',
  'victoriousl',
  'violentl',
  'vivaciousl',
  'warml',
  'waverl',
  'weakl',
  'wearil',
  'weekl',
  'wildl',
  'wisel',
  'worldl',
  'wrinkl',
  'yearl'
];

var adverbRegex = new RegExp('\\b(' + adverbs.join('|') + ')(y)\\b', 'gi');
var matcher = require("./matcher");

module.exports = function (text) {
  return matcher(adverbRegex, text, "adverbs");
};

},{"./matcher":7}],7:[function(require,module,exports){
var matcher = function(regex, text, type) {
  var results = [];

  while (result = regex.exec(text)) {
    results.push({index: result.index, offset: result[0].length});
  }

  return results;
};

module.exports = matcher;

},{}],8:[function(require,module,exports){
var cliches = [
  'a chip off the old block',
  'a clean slate',
  'a dark and stormy night',
  'a far cry',
  'a fine kettle of fish',
  'a loose cannon',
  'a penny saved is a penny earned',
  'a tough row to hoe',
  'a word to the wise',
  'ace in the hole',
  'acid test',
  'add insult to injury',
  'against all odds',
  'air your dirty laundry',
  'all fun and games',
  'all in a day\'s work',
  'all talk, no action',
  'all thumbs',
  'all your eggs in one basket',
  'all\'s fair in love and war',
  'all\'s well that ends well',
  'almighty dollar',
  'American as apple pie',
  'an axe to grind',
  'another day, another dollar',
  'armed to the teeth',
  'as luck would have it',
  'as old as time',
  'as the crow flies',
  'at loose ends',
  'at my wits end',
  'avoid like the plague',
  'babe in the woods',
  'back against the wall',
  'back in the saddle',
  'back to square one',
  'back to the drawing board',
  'bad to the bone',
  'badge of honor',
  'bald faced liar',
  'ballpark figure',
  'banging your head against a brick wall',
  'baptism by fire',
  'barking up the wrong tree',
  'bat out of hell',
  'be all and end all',
  'beat a dead horse',
  'beat around the bush',
  'been there, done that',
  'beggars can\'t be choosers',
  'behind the eight ball',
  'bend over backwards',
  'benefit of the doubt',
  'bent out of shape',
  'best thing since sliced bread',
  'bet your bottom dollar',
  'better half',
  'better late than never',
  'better mousetrap',
  'better safe than sorry',
  'between a rock and a hard place',
  'beyond the pale',
  'bide your time',
  'big as life',
  'big cheese',
  'big fish in a small pond',
  'big man on campus',
  'bigger they are the harder they fall',
  'bird in the hand',
  'bird\'s eye view',
  'birds and the bees',
  'birds of a feather flock together',
  'bit the hand that feeds you',
  'bite the bullet',
  'bite the dust',
  'bitten off more than he can chew',
  'black as coal',
  'black as pitch',
  'black as the ace of spades',
  'blast from the past',
  'bleeding heart',
  'blessing in disguise',
  'blind ambition',
  'blind as a bat',
  'blind leading the blind',
  'blood is thicker than water',
  'blood sweat and tears',
  'blow off steam',
  'blow your own horn',
  'blushing bride',
  'boils down to',
  'bolt from the blue',
  'bone to pick',
  'bored stiff',
  'bored to tears',
  'bottomless pit',
  'boys will be boys',
  'bright and early',
  'brings home the bacon',
  'broad across the beam',
  'broken record',
  'brought back to reality',
  'bull by the horns',
  'bull in a china shop',
  'burn the midnight oil',
  'burning question',
  'burning the candle at both ends',
  'burst your bubble',
  'bury the hatchet',
  'busy as a bee',
  'by hook or by crook',
  'call a spade a spade',
  'called onto the carpet',
  'calm before the storm',
  'can of worms',
  'can\'t cut the mustard',
  'can\'t hold a candle to',
  'case of mistaken identity',
  'cat got your tongue',
  'cat\'s meow',
  'caught in the crossfire',
  'caught red-handed',
  'checkered past',
  'chomping at the bit',
  'cleanliness is next to godliness',
  'clear as a bell',
  'clear as mud',
  'close to the vest',
  'cock and bull story',
  'cold shoulder',
  'come hell or high water',
  'cool as a cucumber',
  'cool, calm, and collected',
  'cost a king\'s ransom',
  'count your blessings',
  'crack of dawn',
  'crash course',
  'creature comforts',
  'cross that bridge when you come to it',
  'crushing blow',
  'cry like a baby',
  'cry me a river',
  'cry over spilt milk',
  'crystal clear',
  'curiosity killed the cat',
  'cut and dried',
  'cut through the red tape',
  'cut to the chase',
  'cute as a bugs ear',
  'cute as a button',
  'cute as a puppy',
  'cuts to the quick',
  'dark before the dawn',
  'day in, day out',
  'dead as a doornail',
  'devil is in the details',
  'dime a dozen',
  'divide and conquer',
  'dog and pony show',
  'dog days',
  'dog eat dog',
  'dog tired',
  'don\'t burn your bridges',
  'don\'t count your chickens',
  'don\'t look a gift horse in the mouth',
  'don\'t rock the boat',
  'don\'t step on anyone\'s toes',
  'don\'t take any wooden nickels',
  'down and out',
  'down at the heels',
  'down in the dumps',
  'down the hatch',
  'down to earth',
  'draw the line',
  'dressed to kill',
  'dressed to the nines',
  'drives me up the wall',
  'dull as dishwater',
  'dyed in the wool',
  'eagle eye',
  'ear to the ground',
  'early bird catches the worm',
  'easier said than done',
  'easy as pie',
  'eat your heart out',
  'eat your words',
  'eleventh hour',
  'even the playing field',
  'every dog has its day',
  'every fiber of my being',
  'everything but the kitchen sink',
  'eye for an eye',
  'face the music',
  'facts of life',
  'fair weather friend',
  'fall by the wayside',
  'fan the flames',
  'feast or famine',
  'feather your nest',
  'feathered friends',
  'few and far between',
  'fifteen minutes of fame',
  'filthy vermin',
  'fine kettle of fish',
  'fish out of water',
  'fishing for a compliment',
  'fit as a fiddle',
  'fit the bill',
  'fit to be tied',
  'flash in the pan',
  'flat as a pancake',
  'flip your lid',
  'flog a dead horse',
  'fly by night',
  'fly the coop',
  'follow your heart',
  'for all intents and purposes',
  'for the birds',
  'for what it\'s worth',
  'force of nature',
  'force to be reckoned with',
  'forgive and forget',
  'fox in the henhouse',
  'free and easy',
  'free as a bird',
  'fresh as a daisy',
  'full steam ahead',
  'fun in the sun',
  'garbage in, garbage out',
  'gentle as a lamb',
  'get a kick out of',
  'get a leg up',
  'get down and dirty',
  'get the lead out',
  'get to the bottom of',
  'get your feet wet',
  'gets my goat',
  'gilding the lily',
  'give and take',
  'go against the grain',
  'go at it tooth and nail',
  'go for broke',
  'go him one better',
  'go the extra mile',
  'go with the flow',
  'goes without saying',
  'good as gold',
  'good deed for the day',
  'good things come to those who wait',
  'good time was had by all',
  'good times were had by all',
  'greased lightning',
  'greek to me',
  'green thumb',
  'green-eyed monster',
  'grist for the mill',
  'growing like a weed',
  'hair of the dog',
  'hand to mouth',
  'happy as a clam',
  'happy as a lark',
  'hasn\'t a clue',
  'have a nice day',
  'have high hopes',
  'have the last laugh',
  'haven\'t got a row to hoe',
  'head honcho',
  'head over heels',
  'hear a pin drop',
  'heard it through the grapevine',
  'heart\'s content',
  'heavy as lead',
  'hem and haw',
  'high and dry',
  'high and mighty',
  'high as a kite',
  'hit paydirt',
  'hold your head up high',
  'hold your horses',
  'hold your own',
  'hold your tongue',
  'honest as the day is long',
  'horns of a dilemma',
  'horse of a different color',
  'hot under the collar',
  'hour of need',
  'I beg to differ',
  'icing on the cake',
  'if the shoe fits',
  'if the shoe were on the other foot',
  'in a jam',
  'in a jiffy',
  'in a nutshell',
  'in a pig\'s eye',
  'in a pinch',
  'in a word',
  'in hot water',
  'in the gutter',
  'in the nick of time',
  'in the thick of it',
  'in your dreams',
  'it ain\'t over till the fat lady sings',
  'it goes without saying',
  'it takes all kinds',
  'it takes one to know one',
  'it\'s a small world',
  'it\'s only a matter of time',
  'ivory tower',
  'Jack of all trades',
  'jockey for position',
  'jog your memory',
  'joined at the hip',
  'judge a book by its cover',
  'jump down your throat',
  'jump in with both feet',
  'jump on the bandwagon',
  'jump the gun',
  'jump to conclusions',
  'just a hop, skip, and a jump',
  'just the ticket',
  'justice is blind',
  'keep a stiff upper lip',
  'keep an eye on',
  'keep it simple, stupid',
  'keep the home fires burning',
  'keep up with the Joneses',
  'keep your chin up',
  'keep your fingers crossed',
  'kick the bucket',
  'kick up your heels',
  'kick your feet up',
  'kid in a candy store',
  'kill two birds with one stone',
  'kiss of death',
  'knock it out of the park',
  'knock on wood',
  'knock your socks off',
  'know him from Adam',
  'know the ropes',
  'know the score',
  'knuckle down',
  'knuckle sandwich',
  'knuckle under',
  'labor of love',
  'ladder of success',
  'land on your feet',
  'lap of luxury',
  'last but not least',
  'last hurrah',
  'last-ditch effort',
  'law of the jungle',
  'law of the land',
  'lay down the law',
  'leaps and bounds',
  'let sleeping dogs lie',
  'let the cat out of the bag',
  'let the good times roll',
  'let your hair down',
  'let\'s talk turkey',
  'letter perfect',
  'lick your wounds',
  'lies like a rug',
  'life\'s a bitch',
  'life\'s a grind',
  'light at the end of the tunnel',
  'lighter than a feather',
  'lighter than air',
  'like clockwork',
  'like father like son',
  'like taking candy from a baby',
  'like there\'s no tomorrow',
  'lion\'s share',
  'live and learn',
  'live and let live',
  'long and short of it',
  'long lost love',
  'look before you leap',
  'look down your nose',
  'look what the cat dragged in',
  'looking a gift horse in the mouth',
  'looks like death warmed over',
  'loose cannon',
  'lose your head',
  'lose your temper',
  'loud as a horn',
  'lounge lizard',
  'loved and lost',
  'low man on the totem pole',
  'luck of the draw',
  'luck of the Irish',
  'make hay while the sun shines',
  'make money hand over fist',
  'make my day',
  'make the best of a bad situation',
  'make the best of it',
  'make your blood boil',
  'man of few words',
  'man\'s best friend',
  'mark my words',
  'meaningful dialogue',
  'missed the boat on that one',
  'moment in the sun',
  'moment of glory',
  'moment of truth',
  'money to burn',
  'more power to you',
  'more than one way to skin a cat',
  'movers and shakers',
  'moving experience',
  'naked as a jaybird',
  'naked truth',
  'neat as a pin',
  'needle in a haystack',
  'needless to say',
  'neither here nor there',
  'never look back',
  'never say never',
  'nip and tuck',
  'nip it in the bud',
  'no guts, no glory',
  'no love lost',
  'no pain, no gain',
  'no skin off my back',
  'no stone unturned',
  'no time like the present',
  'no use crying over spilled milk',
  'nose to the grindstone',
  'not a hope in hell',
  'not a minute\'s peace',
  'not in my backyard',
  'not playing with a full deck',
  'not the end of the world',
  'not written in stone',
  'nothing to sneeze at',
  'nothing ventured nothing gained',
  'now we\'re cooking',
  'off the top of my head',
  'off the wagon',
  'off the wall',
  'old hat',
  'older and wiser',
  'older than dirt',
  'older than Methuselah',
  'on a roll',
  'on cloud nine',
  'on pins and needles',
  'on the bandwagon',
  'on the money',
  'on the nose',
  'on the rocks',
  'on the spot',
  'on the tip of my tongue',
  'on the wagon',
  'on thin ice',
  'once bitten, twice shy',
  'one bad apple doesn\'t spoil the bushel',
  'one born every minute',
  'one brick short',
  'one foot in the grave',
  'one in a million',
  'one red cent',
  'only game in town',
  'open a can of worms',
  'open and shut case',
  'open the flood gates',
  'opportunity doesn\'t knock twice',
  'out of pocket',
  'out of sight, out of mind',
  'out of the frying pan into the fire',
  'out of the woods',
  'out on a limb',
  'over a barrel',
  'over the hump',
  'pain and suffering',
  'pain in the',
  'panic button',
  'par for the course',
  'part and parcel',
  'party pooper',
  'pass the buck',
  'patience is a virtue',
  'pay through the nose',
  'penny pincher',
  'perfect storm',
  'pig in a poke',
  'pile it on',
  'pillar of the community',
  'pin your hopes on',
  'pitter patter of little feet',
  'plain as day',
  'plain as the nose on your face',
  'play by the rules',
  'play your cards right',
  'playing the field',
  'playing with fire',
  'pleased as punch',
  'plenty of fish in the sea',
  'point with pride',
  'poor as a church mouse',
  'pot calling the kettle black',
  'pretty as a picture',
  'pull a fast one',
  'pull your punches',
  'pulling your leg',
  'pure as the driven snow',
  'put it in a nutshell',
  'put one over on you',
  'put the cart before the horse',
  'put the pedal to the metal',
  'put your best foot forward',
  'put your foot down',
  'quick as a bunny',
  'quick as a lick',
  'quick as a wink',
  'quick as lightning',
  'quiet as a dormouse',
  'rags to riches',
  'raining buckets',
  'raining cats and dogs',
  'rank and file',
  'rat race',
  'reap what you sow',
  'red as a beet',
  'red herring',
  'reinvent the wheel',
  'rich and famous',
  'rings a bell',
  'ripe old age',
  'ripped me off',
  'rise and shine',
  'road to hell is paved with good intentions',
  'rob Peter to pay Paul',
  'roll over in the grave',
  'rub the wrong way',
  'ruled the roost',
  'running in circles',
  'sad but true',
  'sadder but wiser',
  'salt of the earth',
  'scared stiff',
  'scared to death',
  'sealed with a kiss',
  'second to none',
  'see eye to eye',
  'seen the light',
  'seize the day',
  'set the record straight',
  'set the world on fire',
  'set your teeth on edge',
  'sharp as a tack',
  'shoot for the moon',
  'shoot the breeze',
  'shot in the dark',
  'shoulder to the wheel',
  'sick as a dog',
  'sigh of relief',
  'signed, sealed, and delivered',
  'sink or swim',
  'six of one, half a dozen of another',
  'skating on thin ice',
  'slept like a log',
  'slinging mud',
  'slippery as an eel',
  'slow as molasses',
  'smart as a whip',
  'smooth as a baby\'s bottom',
  'sneaking suspicion',
  'snug as a bug in a rug',
  'sow wild oats',
  'spare the rod, spoil the child',
  'speak of the devil',
  'spilled the beans',
  'spinning your wheels',
  'spitting image of',
  'spoke with relish',
  'spread like wildfire',
  'spring to life',
  'squeaky wheel gets the grease',
  'stands out like a sore thumb',
  'start from scratch',
  'stick in the mud',
  'still waters run deep',
  'stitch in time',
  'stop and smell the roses',
  'straight as an arrow',
  'straw that broke the camel\'s back',
  'strong as an ox',
  'stubborn as a mule',
  'stuff that dreams are made of',
  'stuffed shirt',
  'sweating blood',
  'sweating bullets',
  'take a load off',
  'take one for the team',
  'take the bait',
  'take the bull by the horns',
  'take the plunge',
  'takes one to know one',
  'takes two to tango',
  'the more the merrier',
  'the real deal',
  'the real McCoy',
  'the red carpet treatment',
  'the same old story',
  'there is no accounting for taste',
  'thick as a brick',
  'thick as thieves',
  'thin as a rail',
  'think outside of the box',
  'third time\'s the charm',
  'this day and age',
  'this hurts me worse than it hurts you',
  'this point in time',
  'three sheets to the wind',
  'through thick and thin',
  'throw in the towel',
  'tie one on',
  'tighter than a drum',
  'time and time again',
  'time is of the essence',
  'tip of the iceberg',
  'tired but happy',
  'to coin a phrase',
  'to each his own',
  'to make a long story short',
  'to the best of my knowledge',
  'toe the line',
  'tongue in cheek',
  'too good to be true',
  'too hot to handle',
  'too numerous to mention',
  'touch with a ten foot pole',
  'tough as nails',
  'trial and error',
  'trials and tribulations',
  'tried and true',
  'trip down memory lane',
  'twist of fate',
  'two cents worth',
  'two peas in a pod',
  'ugly as sin',
  'under the counter',
  'under the gun',
  'under the same roof',
  'under the weather',
  'until the cows come home',
  'unvarnished truth',
  'up the creek',
  'uphill battle',
  'upper crust',
  'upset the applecart',
  'vain attempt',
  'vain effort',
  'vanquish the enemy',
  'vested interest',
  'waiting for the other shoe to drop',
  'wakeup call',
  'warm welcome',
  'watch your p\'s and q\'s',
  'watch your tongue',
  'watching the clock',
  'water under the bridge',
  'weather the storm',
  'weed them out',
  'week of Sundays',
  'went belly up',
  'wet behind the ears',
  'what goes around comes around',
  'what you see is what you get',
  'when it rains, it pours',
  'when push comes to shove',
  'when the cat\'s away',
  'when the going gets tough, the tough get going',
  'white as a sheet',
  'whole ball of wax',
  'whole hog',
  'whole nine yards',
  'wild goose chase',
  'will wonders never cease?',
  'wisdom of the ages',
  'wise as an owl',
  'wolf at the door',
  'words fail me',
  'work like a dog',
  'world weary',
  'worst nightmare',
  'worth its weight in gold',
  'wrong side of the bed',
  'yanking your chain',
  'yappy as a dog',
  'years young',
  'you are what you eat',
  'you can run but you can\'t hide',
  'you only live once',
  'you\'re the boss ',
  'young and foolish',
  'young and vibrant',
];

var clicheRegex = new RegExp('\\b(' + cliches.join('|') + ')\\b', 'gi');
var matcher = require("./matcher");

module.exports = function (text) {
  return matcher(clicheRegex, text, "clichés");
};

},{"./matcher":9}],9:[function(require,module,exports){
module.exports=require(7)
},{}],10:[function(require,module,exports){
var irregulars = [
  'awoken',
  'been',
  'born',
  'beat',
  'become',
  'begun',
  'bent',
  'beset',
  'bet',
  'bid',
  'bidden',
  'bound',
  'bitten',
  'bled',
  'blown',
  'broken',
  'bred',
  'brought',
  'broadcast',
  'built',
  'burnt',
  'burst',
  'bought',
  'cast',
  'caught',
  'chosen',
  'clung',
  'come',
  'cost',
  'crept',
  'cut',
  'dealt',
  'dug',
  'dived',
  'done',
  'drawn',
  'dreamt',
  'driven',
  'drunk',
  'eaten',
  'fallen',
  'fed',
  'felt',
  'fought',
  'found',
  'fit',
  'fled',
  'flung',
  'flown',
  'forbidden',
  'forgotten',
  'foregone',
  'forgiven',
  'forsaken',
  'frozen',
  'gotten',
  'given',
  'gone',
  'ground',
  'grown',
  'hung',
  'heard',
  'hidden',
  'hit',
  'held',
  'hurt',
  'kept',
  'knelt',
  'knit',
  'known',
  'laid',
  'led',
  'leapt',
  'learnt',
  'left',
  'lent',
  'let',
  'lain',
  'lighted',
  'lost',
  'made',
  'meant',
  'met',
  'misspelt',
  'mistaken',
  'mown',
  'overcome',
  'overdone',
  'overtaken',
  'overthrown',
  'paid',
  'pled',
  'proven',
  'put',
  'quit',
  'read',
  'rid',
  'ridden',
  'rung',
  'risen',
  'run',
  'sawn',
  'said',
  'seen',
  'sought',
  'sold',
  'sent',
  'set',
  'sewn',
  'shaken',
  'shaven',
  'shorn',
  'shed',
  'shone',
  'shod',
  'shot',
  'shown',
  'shrunk',
  'shut',
  'sung',
  'sunk',
  'sat',
  'slept',
  'slain',
  'slid',
  'slung',
  'slit',
  'smitten',
  'sown',
  'spoken',
  'sped',
  'spent',
  'spilt',
  'spun',
  'spit',
  'split',
  'spread',
  'sprung',
  'stood',
  'stolen',
  'stuck',
  'stung',
  'stunk',
  'stridden',
  'struck',
  'strung',
  'striven',
  'sworn',
  'swept',
  'swollen',
  'swum',
  'swung',
  'taken',
  'taught',
  'torn',
  'told',
  'thought',
  'thrived',
  'thrown',
  'thrust',
  'trodden',
  'understood',
  'upheld',
  'upset',
  'woken',
  'worn',
  'woven',
  'wed',
  'wept',
  'wound',
  'won',
  'withheld',
  'withstood',
  'wrung',
  'written'
];

var exceptions = [
  'indeed',
];

var re = new RegExp('\\b(am|are|were|being|is|been|was|be)\\b\\s*([\\w]+ed|' + irregulars.join('|') + ')\\b', 'gi');

module.exports = function (text) {
  var suggestions = [];
  while (match = re.exec(text)) {
    if (exceptions.indexOf(match[2].toLowerCase()) === -1) {
      suggestions.push({
        index: match.index,
        offset: match[0].length
      });
    }
  }
  return suggestions;
}

},{}],11:[function(require,module,exports){
module.exports=require(7)
},{}],12:[function(require,module,exports){
var matcher = require("./matcher");
var wordyWords = [
  'a number of',
  'abundance',
  'accede to',
  'accelerate',
  'accentuate',
  'accompany',
  'accomplish',
  'accorded',
  'accrue',
  'acquiesce',
  'acquire',
  'additional',
  'adjacent to',
  'adjustment',
  'admissible',
  'advantageous',
  'adversely impact',
  'advise',
  'aforementioned',
  'aggregate',
  'aircraft',
  'all of',
  'all things considered',
  'alleviate',
  'allocate',
  'along the lines of',
  'already existing',
  'alternatively',
  'ameliorate',
  'anticipate',
  'apparent',
  'appreciable',
  'as a matter of fact',
  'as a means of',
  'as far as I\'m concerned',
  'as of yet',
  'as to',
  'as yet',
  'ascertain',
  'assistance',
  'at the present time',
  'at this time',
  'attain',
  'attributable to',
  'authorize',
  'because of the fact that',
  'belated',
  'benefit from',
  'bestow',
  'by means of',
  'by virtue of the fact that',
  'by virtue of',
  'cease',
  'close proximity',
  'commence',
  'comply with',
  'concerning',
  'consequently',
  'consolidate',
  'constitutes',
  'demonstrate',
  'depart',
  'designate',
  'discontinue',
  'due to the fact that',
  'each and every',
  'economical',
  'eliminate',
  'elucidate',
  'employ',
  'endeavor',
  'enumerate',
  'equitable',
  'equivalent',
  'evaluate',
  'evidenced',
  'exclusively',
  'expedite',
  'expend',
  'expiration',
  'facilitate',
  'factual evidence',
  'feasible',
  'finalize',
  'first and foremost',
  'for all intents and purposes',
  'for the most part',
  'for the purpose of',
  'forfeit',
  'formulate',
  'have a tendency to',
  'honest truth',
  'however',
  'if and when',
  'impacted',
  'implement',
  'in a manner of speaking',
  'in a timely manner',
  'in a very real sense',
  'in accordance with',
  'in addition',
  'in all likelihood',
  'in an effort to',
  'in between',
  'in excess of',
  'in lieu of',
  'in light of the fact that',
  'in many cases',
  'in my opinion',
  'in order to',
  'in regard to',
  'in some instances',
  'in terms of',
  'in the case of ',
  'in the event that',
  'in the final analysis',
  'in the nature of',
  'in the near future',
  'in the process of',
  'inception',
  'incumbent upon',
  'indicate',
  'indication',
  'initiate',
  'is applicable to',
  'is authorized to',
  'is responsible for',
  'it is essential',
  'it is',
  'it seems that',
  'it was',
  'magnitude',
  'maximum',
  'methodology',
  'minimize',
  'minimum',
  'modify',
  'monitor',
  'multiple',
  'necessitate',
  'nevertheless',
  'not certain',
  'not many',
  'not often',
  'not unless',
  'not unlike',
  'notwithstanding',
  'null and void',
  'numerous',
  'objective',
  'obligate',
  'obtain',
  'on the contrary',
  'on the other hand',
  'one particular',
  'optimum',
  'overall',
  'owing to the fact that',
  'participate',
  'particulars',
  'pass away',
  'pertaining to',
  'point in time',
  'portion',
  'possess',
  'preclude',
  'previously',
  'prior to',
  'prioritize',
  'procure',
  'proficiency',
  'provided that',
  'purchase',
  'put simply',
  'readily apparent',
  'refer back',
  'regarding',
  'relocate',
  'remainder',
  'remuneration',
  'requirement',
  'reside',
  'residence',
  'retain',
  'satisfy',
  'shall',
  'should you wish',
  'similar to',
  'solicit',
  'span across',
  'strategize',
  'subsequent',
  'substantial',
  'successfully complete',
  'sufficient',
  'terminate',
  'the month of',
  'the point I am trying to make',
  'therefore',
  'time period',
  'took advantage of',
  'transmit',
  'transpire',
  'type of',
  'until such time as',
  'utilization',
  'utilize',
  'validate',
  'various different',
  'what I mean to say is',
  'whether or not',
  'with respect to',
  'with the exception of',
  'witnessed'
];

var wordyRegex = new RegExp('\\b(' + wordyWords.join('|') + ')\\b', 'gi');

module.exports = function(text) {
  return matcher(wordyRegex, text, "wordy");
};

},{"./matcher":11}],13:[function(require,module,exports){
var weasels = [
  'many',
  'various',
  'very',
  'fairly',
  'several',
  'extremely',
  'exceedingly',
  'quite',
  'remarkably',
  'few',
  'surprisingly',
  'mostly',
  'largely',
  'huge',
  'tiny',
  'is a number',
  'are a number',
  'excellent',
  'interestingly',
  'significantly',
  'substantially',
  'clearly',
  'vast',
  'relatively',
  'completely'
];

// Allow "too many" and "too few"
var exceptions = [
  'many',
  'few'
]

var re = new RegExp('\\b(' + weasels.join('|') + ')\\b', 'gi');

module.exports = function (text, opts) {
  var suggestions = [];
  while (match = re.exec(text)) {
    var weasel = match[0].toLowerCase();
    if (exceptions.indexOf(weasel) === -1 ||
        text.substr(match.index-4, 4) !== 'too ') {
      suggestions.push({
        index: match.index,
        offset: weasel.length,
      });
    }
  }
  return suggestions;
};

},{}],14:[function(require,module,exports){
var checks = {
  weasels  : { fn: require('weasel-words'),            explanation: 'is a weasel word' },
  illusion : { fn: require('./lib/lexical-illusions'), explanation: 'is repeated' },
  so       : { fn: require('./lib/starts-with-so'),    explanation: 'adds no meaning' },
  thereIs  : { fn: require('./lib/there-is'),          explanation: 'is unnecessary verbiage' },
  passive  : { fn: require('passive-voice'),           explanation: 'is passive voice' },
  adverb   : { fn: require('adverb-where'),            explanation: 'can weaken meaning'},
  tooWordy : { fn: require('too-wordy'),               explanation: 'is wordy or unneeded'},
  cliches  : { fn: require('no-cliches'),              explanation: 'is a cliche'},
};

module.exports = function (text, opts) {
  opts = opts || {};
  var suggestions = [];
  Object.keys(checks).forEach(function (checkName) {
    if (opts[checkName] !== false) {
      suggestions = suggestions.concat(checks[checkName].fn(text).
                          map(reasonable(checks[checkName].explanation)));
    }
  });

  return dedup(suggestions).sort(function (a, b) {
    return a.index < b.index ? -1 : 1;
  });

  function reasonable (reason) {
    return function (suggestion) {
      suggestion.reason = '"' +
          text.substr(suggestion.index, suggestion.offset) +
          '" ' + reason;
      return suggestion;
    };
  }
};


function dedup (suggestions) {
  var dupsHash = {};

  return suggestions.reduce(function(memo, suggestion) {
    var key = suggestion.index + ":" + suggestion.offset;
    if (!dupsHash[key]) {
      dupsHash[key] = suggestion;
      memo.push(suggestion);
    } else {
      dupsHash[key].reason += " and " + suggestion.reason.substring(suggestion.offset + 3);
    }
    return memo;
  }, []);
}

module.exports.annotate = require('./lib/annotate');

},{"./lib/annotate":2,"./lib/lexical-illusions":3,"./lib/starts-with-so":4,"./lib/there-is":5,"adverb-where":6,"no-cliches":8,"passive-voice":10,"too-wordy":12,"weasel-words":13}]},{},[1]);
