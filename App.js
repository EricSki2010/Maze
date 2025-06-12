//#region
let startingPoint = {x: 1, y: 1};
const tileTypeMap = {
  'AA': 'brick',
  'AB': 'crate',
  'AC': 'water',
  'AD': 'waterflow'
};
//#endregion
function Read(str) {
  const DataU = str.split("$");
  const StartingPointA = DataU[0].split("'");
  startingPoint.x = Number(StartingPointA[0]);
  startingPoint.y = Number(StartingPointA[1]);
  const parts = DataU[1].split("'");
  parts.forEach((part) => {
    if (!part.trim()) return;
    const [letters, numbers] = splitAlphaNumeric(part);
    const tileType = ReadLetters(letters.toUpperCase()); // force uppercase
    const [x, y, rotationDeg] = ReadNumbers(numbers);
    if (isNaN(x) || isNaN(y)) return;
    placeBlock(x, y, tileType, rotationDeg);
  });
}
function ReadLetters(code) {
  return tileTypeMap[code] || 'unknown';
}
function clearLevel() {
  $('.block').remove(); 
  $('.water').remove();
  blocks.length = 0;
  blockedTiles.length = 0;
  pushableTiles.length = 0;
  breakableTilesRespawn.length = 0;
  waterTiles.length = 0;
  waterFlowTiles.length = 0;
}
function WriteLetters(type) {
  for (const [code, value] of Object.entries(tileTypeMap)) {
    if (value === type) return code;
  }
  return '??';
}
function ReadNumbers(numbers) {
  const numbered = numbers.split(":").map(Number);
  const [x = 0, y = 0, rotCode = 0] = numbered;
  const rotationDeg = (rotCode % 4) * 90;
  return [x, y, rotationDeg];
}
function splitAlphaNumeric(str) {
  const match = str.match(/^([A-Za-z]+)(.+)$/);
  if (match) {
    return [match[1], match[2]];
  } else {
    return [str, ''];
  }
}
function LoadLevel(level){
  clearLevel();
  Read(level);
  ready();
  setViewTo(startingPoint.x, startingPoint.y);
  SyncSelector();
}
function SaveLevel() {
  const gameWidth = Math.floor($('#game-container').width() / step);
  const gameHeight = Math.floor($('#game-container').height() / step);

  let result = "";

  const filteredBlocks = blocks.filter(block => {
    const onLeftEdge = block.x === 0;
    const onRightEdge = block.x === gameWidth - 1;
    const onTopEdge = block.y === 0;
    const onBottomEdge = block.y === gameHeight - 1;

    if (block.type === 'brick' && (onLeftEdge || onRightEdge || onTopEdge || onBottomEdge)) {
      return false; // exclude border bricks
    }
    return true;
  });
  result += `${pos.x}'${pos.y}$`;
  filteredBlocks.sort((a, b) => a.y - b.y || a.x - b.x);

  filteredBlocks.forEach((block, i) => {
    const letters = WriteLetters(block.type);
    const rotCode = (block.rotation || 0) / 90;
    const part = `${letters}${block.x}:${block.y}:${rotCode}`;
    result += part;
    if (i !== filteredBlocks.length - 1) result += `'`;
  });

  $('#levelStringOutput').val(result);

  // Toggle visibility instead of just fadeIn
  $('#copyContainer').fadeToggle(200);

  return result;
}
$(document).ready(() => {
  $('#copyButton').on('click', () => {
    const text = $('#levelStringOutput').val();
    if (navigator.clipboard) {
      navigator.clipboard.writeText(text).then(() => {
        alert('Level string copied to clipboard!');
      }).catch(err => {
        alert('Failed to copy text: ' + err);
      });
    } else {
      alert('Clipboard API not supported in this browser.');
    }
  });
});
document.getElementById('saveLevelBtn').addEventListener('click', () => {
  const result = SaveLevel();
  // Optionally do more with `result` if needed
});
document.getElementById('loadLevelBtn').addEventListener('click', () => {
  const str = document.getElementById('levelStringOutput').value;
  if (str && str.trim()) {
    LoadLevel(str.trim());
  } else {
    alert("Paste a level string into the textbox first!");
  }
});
$(document).ready(() => {
    $('#pasteButton').on('click', async () => {
      if (navigator.clipboard) {
        try {
          const text = await navigator.clipboard.readText();
          $('#levelStringOutput').val(text);
        } catch (err) {
          alert('Failed to read clipboard: ' + err);
        }
      } else {
        alert('Clipboard API not supported in this browser.');
      }
    });
});
window.onbeforeunload = function(event) {
  setViewTo(startingPoint.x, startingPoint.y);
};
$(document).ready(function() {
  LoadLevel("1'1$");
});
