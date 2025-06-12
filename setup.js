//#region Global Variables
let blockedTiles = [];
let pushableTiles = [];
let breakableTilesRespawn = [];
let waterFlowTiles = [];
let waterTiles = [];
let canMove = true;
let cooldownTime = 100;
const step = 64;
let pos = { x: 0, y: 0 };
let direction = '';
let startX;
let reset = false;
let startY;
let flowingCrates = {};
let respawningCrates = [];
let keyHoldTimer = null;
let keyHeld = false;
let prevTargetX = null;
let prevTargetY = null;
let IfCrateSelected = false;
let CrateSelected = {};
let drownTimer = null;
let shrinkInterval = null;
let isOnWater = false;
let isOnFlowingWater = false;
let flowingInterval = null;
let originalWidth = null;
let originalHeight = null;
let brightnessLevel = 1;
let OgCoolDownTime = cooldownTime;
let sinkingCrates = {};
let leftMouseDown = false;
let bKeyPressed = false;
let blocks = [];
let rKeyPressed = false;
//#endregion
function SyncSelector(){
    prevTargetX = null;  // Force selector refresh
    prevTargetY = null;
}
function getRotationDegrees(element) {
  if (!element || !element[0]) {
    console.warn('Invalid element passed to getRotationDegrees');
    return 0; // default rotation
  }
  const style = window.getComputedStyle(element[0]);
  const transform = style.getPropertyValue('transform');

  if (transform === 'none') return 0;

  // transform is something like "matrix(a, b, c, d, tx, ty)"
  const values = transform.split('(')[1].split(')')[0].split(',');
  const a = parseFloat(values[0]);
  const b = parseFloat(values[1]);
  // Calculate rotation angle in degrees
  const angle = Math.round(Math.atan2(b, a) * (180 / Math.PI));
  return (angle < 0) ? angle + 360 : angle;
}
function removeRespawningCrate(x, y) {
  const index = respawningCrates.findIndex(tile => tile.x === x && tile.y === y);
  if (index !== -1) {
    respawningCrates.splice(index, 1);
  }
}
function placeBlock(x, y, type, rotate = 0) {
  // Remove any existing block at this position
  $(`#game-border [data-x='${x}'][data-y='${y}']`).remove();

  let block, srcName = 'default.png', srcClass = '', srcWidth = '64px', srcHeight = '64px';
  let offset = 0, srcImgClass = '', imgAmount = 1;

  if (type === 'brick') {
    srcName = 'brick.png';
    srcClass = 'block';
  } else if (type === 'crate') {
    srcName = 'crate.png';
    srcClass = 'push block crate';
  } else if (type === 'water') {
    srcName = 'water.png';
    srcClass = 'water';
  } else if (type === 'waterflow') {
    srcName = 'WaterFlow/waterflow1.png';
    srcClass = 'water flowingWaterTiles';
    srcImgClass = 'waterflow';
    imgAmount = 2;
  }

  if (imgAmount === 1) {
    block = $(`<div class="${srcClass}" style="transform: rotate(${rotate}deg); width: ${srcWidth}; height: ${srcHeight}; position: absolute;">
                 <img class="${srcImgClass}" style="width: 64px; height: 64px;" src="images/${srcName}">
               </div>`);
  } else {
    block = $(`<div class="${srcClass}" style="transform: rotate(${rotate}deg); width: ${srcWidth}; height: ${srcHeight}; position: absolute;">
                 <img class="${srcImgClass}" style="position: absolute; top: 0px; left: 0px; width: 64px; height: 64px;" src="images/${srcName}">
                 <img class="${srcImgClass}" style="position: absolute; top: 0px; left: -64px; width: 64px; height: 64px;" src="images/${srcName}">
               </div>`);
  }

  const left = x * step + offset;
  const top = y * step;

  block.css({ left: `${left}px`, top: `${top}px` });
  block.attr('data-x', x);
  block.attr('data-y', y);
  $('#game-border').append(block);
  blocks.push({ x, y, type, rotation: rotate });

  // Remove all existing blocks at (x, y)
  for (let i = blocks.length - 1; i >= 0; i--) {
    if (blocks[i].x === x && blocks[i].y === y) {
      blocks.splice(i, 1);
    }
  }

  // Only now push the new block
  blocks.push({ x, y, type, rotation: rotate });

  // Avoid duplicates in state arrays:
  if (type === 'brick') {
    if (!blockedTiles.some(t => t.x === x && t.y === y)) {
      blockedTiles.push({ x, y });
    }
  } else if (type === 'waterflow') {
    if (!waterFlowTiles.some(t => t.x === x && t.y === y)) {
      waterFlowTiles.push({ x, y });
    }
    if (!waterTiles.some(t => t.x === x && t.y === y)) {
      waterTiles.push({ x, y });
    }
    block.find('.waterflow').each(function() {
      const originalLeft = parseInt($(this).css('left'), 10) || 0;
      $(this).data('originalLeft', originalLeft);
    });
    // setup data-originalLeft...
  } else if (type === 'crate') {
    if (!pushableTiles.some(t => t.x === x && t.y === y)) {
      pushableTiles.push({ x, y, spawnX: x, spawnY: y });
    }
    if (!breakableTilesRespawn.some(tile => tile.x === x && tile.y === y)) {
      breakableTilesRespawn.push({ x, y });
    }
  }
}
function isCrateAt(x, y) {
  return $(`.push[data-x='${x}'][data-y='${y}']`).length > 0;
}
function createCircularTimer(x, y, duration, onComplete) {
  const timer = $('<div class="circular-timer"></div>');
  const left = x * step + 32 - 32; // center on tile
  const top = y * step;

  timer.css({ position: 'absolute', left: `${left}px`, top: `${top}px`, width: '64px', height: '64px', 'border-radius': '50%' });
  $('#game-border').append(timer);

  let startTime = null;

  function animate(timestamp) {
    if (!startTime) startTime = timestamp;
    const elapsed = timestamp - startTime;
    const angle = (elapsed / duration) * 360;
    timer.css('background', `conic-gradient(#00cc00 ${angle}deg, #ccc ${angle}deg)`);

    if (elapsed < duration) {
      requestAnimationFrame(animate);
    } else {
      timer.remove();
      if (onComplete) onComplete();
    }
  }

  requestAnimationFrame(animate);
}
function respawnCrate(x, y) {
  console.log(`Starting respawn timer at (${x}, ${y})`);

  createCircularTimer(x, y, 5000, tryRespawn); // 5 second timer

  function tryRespawn() {
    const spotBlocked = blockedTiles.some(tile => tile.x === x && tile.y === y);
    const crateThere = pushableTiles.some(tile => tile.x === x && tile.y === y);

    if (!spotBlocked && !crateThere) {
      console.log('Space is free, placing crate');

      const block = $(`<div class="push block crate" style="width: 64px; height: 64px; position: absolute;">
                        <img style="width: 64px; height: 64px;" src="images/crate.png">
                      </div>`);
      const left = x * step;
      console.log(left);
      const top = y * step;

      block.css({ left: `${left}px`, top: `${top}px` });
      block.attr('data-x', x);
      block.attr('data-y', y);

      $('#game-border').append(block);

      pushableTiles.push({ x, y, spawnX: x, spawnY: y });
      removeRespawningCrate(x, y);
      prevTargetX = null;  // Force selector refresh
      prevTargetY = null;
    } else {
      console.log('Blocked! Retrying in 1s...');
      setTimeout(tryRespawn, 1000);
    }
  }
}
function updateCamera() {
  const left = -(pos.x * step) + (window.innerWidth / 2) - (step / 2);
  const top = -(pos.y * step) + (window.innerHeight / 2) - (step / 2);
  $('#game-container').css({ left: `${left}px`, top: `${top}px` });
}
function removeCrate(x, y) {
  // Remove crate from pushableTiles
  pushableTiles = pushableTiles.filter(c => !(c.x === x && c.y === y));
  // Remove from breakableTilesRespawn
  breakableTilesRespawn = breakableTilesRespawn.filter(b => !(b.x === x && b.y === y));
  // Remove from blocks array (optional here if done elsewhere)
  blocks = blocks.filter(b => !(b.x === x && b.y === y));
  // Remove visual block div
  $(`#game-border [data-x='${x}'][data-y='${y}']`).remove();
}
function removeBlockFrom(x, y) {
  // Remove from blocks array
  blocks = blocks.filter(b => !(b.x === x && b.y === y));
  // Remove from blockedTiles, waterTiles, waterFlowTiles, pushableTiles, etc.
  blockedTiles = blockedTiles.filter(t => !(t.x === x && t.y === y));
  waterTiles = waterTiles.filter(t => !(t.x === x && t.y === y));
  waterFlowTiles = waterFlowTiles.filter(t => !(t.x === x && t.y === y));
  pushableTiles = pushableTiles.filter(t => !(t.x === x && t.y === y));
  breakableTilesRespawn = breakableTilesRespawn.filter(t => !(t.x === x && t.y === y));
  // Remove visual block div
  $(`#game-border [data-x='${x}'][data-y='${y}']`).remove();
}
function setViewTo(x, y) {
  startX = x;
  startY = y;
  pos = { x, y };
  updateCamera();
}
function removeFromTileArray(array, x, y) {
  const initialLength = array.length;
  array = array.filter(tile => Number(tile.x) !== Number(x) || Number(tile.y) !== Number(y));
  if (array.length < initialLength) {
    console.log(`✅ Removed (${x}, ${y}) from array`);
  } else {
    console.log(`⚠️ Did NOT find (${x}, ${y}) in array`);
  }
  return array; 
}
function checkCollision(newX, newY) {
  const isBlocked = blockedTiles.some(tile => tile.x === newX && tile.y === newY);
  const isPushable = pushableTiles.some(tile => tile.x === newX && tile.y === newY);
  const isPlayer = (pos.x === newX && pos.y === newY);
  return !(isBlocked || isPushable || isPlayer);
}
function ready() {
  //#region Block placement
  const gameWidth = Math.floor($('#game-container').width() / step);
  const gameHeight = Math.floor($('#game-container').height() / step);
  updateCamera();

  // Build outer walls
  for (let x = 0; x < gameWidth; x++) {
    placeBlock(x, 0, 'brick');
    placeBlock(x, gameHeight - 1, 'brick');
  }
  for (let y = 0; y < gameHeight; y++) {
    placeBlock(0, y, 'brick');
    placeBlock(gameWidth - 1, y, 'brick');
  }

  // Clear arrays before rebuilding
  blockedTiles.length = 0;
  pushableTiles.length = 0;
  breakableTilesRespawn.length = 0;
  waterTiles.length = 0;
  waterFlowTiles.length = 0;
  // Rebuild arrays from DOM elements
  $('.block').each(function () {
    if ($(this).hasClass('push')) return;
    const left = parseInt($(this).css('left'));
    const top = parseInt($(this).css('top'));
    const x = Math.round(left / step);
    const y = Math.round(top / step);
    blockedTiles.push({ x, y });
  });
  $('.push').each(function () {
    const left = parseInt($(this).css('left'));
    const top = parseInt($(this).css('top'));
    const x = Math.round(left / step);
    const y = Math.round(top / step);
    pushableTiles.push({ x, y, spawnX: x, spawnY: y });
  });
  $('.crate').each(function () {
    const left = parseInt($(this).css('left'));
    const top = parseInt($(this).css('top'));
    const x = Math.round(left / step);
    const y = Math.round(top / step);
    breakableTilesRespawn.push({ x, y });
  });
  $('.water').each(function () {
    const left = parseInt($(this).css('left'));
    const top = parseInt($(this).css('top'));
    const x = Math.round(left / step);
    const y = Math.round(top / step);
    waterTiles.push({ x, y });
  });
  $('.waterflow').each(function() {
    const originalLeft = parseInt($(this).css('left'), 10) || 0;
    $(this).data('originalLeft', originalLeft);
  });
  $('.flowingWaterTiles').each(function() {
    const left = parseInt($(this).css('left'));
    const top = parseInt($(this).css('top'));
    const x = Math.round(left / step);
    const y = Math.round(top / step);
    waterFlowTiles.push({ x, y });
  })
  //#endregion 
  //#region keyStuff
  $('#game-border').on('dblclick', '.block, .water, .flowingWaterTiles', function () {
    const x = $(this).attr('data-x');
    const y = $(this).attr('data-y');

    if (x !== undefined && y !== undefined) {
      
      // Optional: show floating position indicator
      const posText = $(`<div class="pos-indicator">(${x}, ${y})</div>`);
      posText.css({
        position: 'absolute',
        left: `${x * step}px`,
        top: `${y * step}px`,
        color: 'white',
        background: 'rgba(0,0,0,0.7)',
        padding: '2px 4px',
        'border-radius': '4px',
        'font-size': '12px',
        'z-index': 9999,
        'pointer-events': 'none',
      });
      $('#game-border').append(posText);
      setTimeout(() => posText.remove(), 1500);
    }
  });
  $(document).on('keydown', function(event) {
    if (event.key.toLowerCase() === 'b') {
      bKeyPressed = true;
    }
    if (event.key.toLowerCase() === 'r') {
      rKeyPressed = true;
    } 
  });
  $(document).on('keyup', function(event) {
    if (event.key.toLowerCase() === 'b') {
      bKeyPressed = false;
    }
    if (event.key.toLowerCase() === 'r') {
      rKeyPressed = false;
    }
  });
  //#endregion
};
$(document).on('click', function(event) {
  if (bKeyPressed) {
    const $game = $('#game-border');
    const rect = $game[0].getBoundingClientRect();
    const mouseX = event.clientX - rect.left;
    const mouseY = event.clientY - rect.top;

    if (isNaN(mouseX) || isNaN(mouseY) || mouseX < 0 || mouseY < 0) return;

    const tileSize = 64;
    const gridX = Math.floor(mouseX / tileSize);
    const gridY = Math.floor(mouseY / tileSize);
    const existingIndex = blocks.findIndex(b => b.x === gridX && b.y === gridY);

    if (existingIndex === -1) {
      removeBlockFrom(gridX, gridY);
      blocks.push({x: gridX, y: gridY, type: 'brick'});
      placeBlock(gridX, gridY, 'brick');
      prevTargetX = null;  // Force selector refresh
      prevTargetY = null;
    } else {
      const prevBlock = blocks[existingIndex];
      if (prevBlock.type === "crate") {
        removeCrate(gridX, gridY);
      }else{
        removeBlockFrom(gridX, gridY);
      }
      blocks.splice(existingIndex, 1);
      prevTargetX = null;  // Force selector refresh
      prevTargetY = null;
      let nextType = null;
      switch (prevBlock.type) {
        case 'brick':
          nextType = 'crate';
          break;
        case 'crate':
          nextType = 'water';
          break;
        case 'water':
          nextType = 'waterflow';
          reset = true;
          setTimeout(() => {
            reset = false;
          }, 200);
          break;
        case 'waterflow':
          nextType = null;
          break;
        default:
          nextType = 'brick';
          
      }
      if (nextType) {
      blocks.push({x: gridX, y: gridY, type: nextType, rotation: 0});
      placeBlock(gridX, gridY, nextType, 0);
        prevTargetX = null;  // Force selector refresh
        prevTargetY = null;
  }}}
  if (rKeyPressed){
    const $game = $('#game-border');
    const rect = $game[0].getBoundingClientRect();
    const mouseX = event.clientX - rect.left;
    const mouseY = event.clientY - rect.top;

    if (isNaN(mouseX) || isNaN(mouseY) || mouseX < 0 || mouseY < 0) return;

    const tileSize = 64;
    const gridX = Math.floor(mouseX / tileSize);
    const gridY = Math.floor(mouseY / tileSize);
    const block = blocks.find(b => b.x === gridX && b.y === gridY);
    if (block) {
      if ($(`#game-border [data-x=${gridX}][data-y=${gridY}]`).hasClass('flowingWaterTiles')){
        reset = true;
        setTimeout(() => {
          reset = false;
        }, 50);
      }
      block.rotation = (block.rotation || 0); // Set 0 if undefined
      block.rotation = (block.rotation + 90) % 360;
      placeBlock(gridX, gridY, block.type, block.rotation);
    }
  }
});
$(document).keydown(function(event) {
  if (!canMove) return;

  let newX = pos.x;
  let newY = pos.y;
  const key = event.key.toLowerCase();

  if (event.shiftKey) {
    switch (key) {
      case 'a':
        $('#faceimg').attr('src', 'images/FaceLeft.png');
        direction = 'left';
        return;
      case 'd':
        $('#faceimg').attr('src', 'images/FaceRight.png');
        direction = 'right';
        return;
      case 'w':
        $('#faceimg').attr('src', 'images/FaceUp.png');
        direction = 'up';
        return;
      case 's':
        $('#faceimg').attr('src', 'images/FaceDown.png');
        direction = 'down';
        return;
      default:
        return;
    }
  }

  switch (key) {
    case 'a':
      $('#faceimg').attr('src', 'images/FaceLeft.png');
      newX -= 1;
      direction = 'left';
      break;
    case 'd':
      $('#faceimg').attr('src', 'images/FaceRight.png');
      newX += 1;
      direction = 'right';
      break;
    case 'w':
      $('#faceimg').attr('src', 'images/FaceUp.png');
      newY -= 1;
      direction = 'up';
      break;
    case 's':
      $('#faceimg').attr('src', 'images/FaceDown.png');
      newY += 1;
      direction = 'down';
      break;
    default:
      return;
  }

  if (checkCollision(newX, newY)) {
    pos.x = newX;
    pos.y = newY;
    updateCamera();
    canMove = false;
    setTimeout(() => { canMove = true; }, cooldownTime);
  } else {
    const pushTile = pushableTiles.find(tile => tile.x === newX && tile.y === newY);
    const deltaX = newX - pos.x;
    const deltaY = newY - pos.y;
    const pushX = newX + deltaX;
    const pushY = newY + deltaY;

    if (pushTile && checkCollision(pushX, pushY) &&
        !pushableTiles.some(tile => tile.x === pushX && tile.y === pushY)) {

      pushTile.x = pushX;
      pushTile.y = pushY;

      const pushElem = $(`.push[data-x='${newX}'][data-y='${newY}']`);
      pushElem.css({ left: `${pushX * step}px`, top: `${pushY * step}px` });
      pushElem.attr('data-x', pushX);
      pushElem.attr('data-y', pushY);

      pos.x = newX;
      pos.y = newY;
      updateCamera();
      canMove = false;
      setTimeout(() => { canMove = true; }, cooldownTime);
    } else {
      console.log("Blocked!");
    }
  }
});

