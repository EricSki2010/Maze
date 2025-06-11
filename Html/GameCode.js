setInterval(() => {
  breakableTilesRespawn.forEach(tile => {
    const found = pushableTiles.find(otherTile => {
      return tile.x === otherTile.spawnX && tile.y === otherTile.spawnY;
    });
    const Respawning = respawningCrates.find(otherTile => {
      return otherTile.x === tile.x && otherTile.y === tile.y;
    });
    if (!found && !Respawning) {
      respawningCrates.push({ x: tile.x, y: tile.y });
      respawnCrate(tile.x, tile.y);
    }
  });
}, 500);
setInterval(() => {
  $('.waterflow').each(function() {
    if (!reset){
      const originalLeft = $(this).data('originalLeft');
      const currentLeft = parseInt($(this).css('left'), 10) || 0; 
      $(this).css('left', (currentLeft + 1) + 'px');
      if (currentLeft - originalLeft >= 64) {
        $(this).css('left', originalLeft + 'px');
      }
    } else {
      const originalLeft = $(this).data('originalLeft');
      $(this).css('left', originalLeft + 'px');
    }
  });
}, 15.625);
function gameLoop() {
  let targetX = pos.x;
  let targetY = pos.y;

  if (direction === 'up') targetY -= 1;
  else if (direction === 'down') targetY += 1;
  else if (direction === 'left') targetX -= 1;
  else if (direction === 'right') targetX += 1;
  else {
    $('.selector').remove();
    prevTargetX = null;
    prevTargetY = null;
    return requestAnimationFrame(gameLoop);
  }

  if (targetX !== prevTargetX || targetY !== prevTargetY) {
    $('.selector').remove();

    // Check if selector is over a crate
    const selectedCrate = pushableTiles.find(tile => tile.x === targetX && tile.y === targetY);
    IfCrateSelected = !!selectedCrate;
    CrateSelected = selectedCrate || {};
    const imgSrc = IfCrateSelected ? 'images/letter_e.png' : 'images/Selected.png';
    const sizeMap = {
      'images/Selected.png': { width: '8px', height: '8px' },
      'images/letter_e.png': { width: '32px', height: 'auto' },
      default: { width: 'auto', height: 'auto' }
    };
    const sizes = sizeMap[imgSrc] || sizeMap.default;
    const imgWidth = sizes.width;
    const imgHeight = sizes.height;

    const block = $(`<div class="selector" style="width: 64px; height: 64px; display: flex; justify-content: center; align-items: center; position: absolute;">
                      <img style="width: ${imgWidth}; height: ${imgHeight};" src="${imgSrc}">
                    </div>`);
    const left = targetX * step;
    const top = targetY * step;
    block.css({ left: `${left}px`, top: `${top}px` });
    $('#game-border').append(block);

    prevTargetX = targetX;
    prevTargetY = targetY;
  }

  //#region Water handling

  const currentlyOnWater = waterTiles.some(tile => tile.x === pos.x && tile.y === pos.y);
  //crate water stuff...
  pushableTiles.forEach(crate => {
    //let brightness = 1;
    let isOnWater = waterTiles.some(w => w.x === crate.x && w.y === crate.y);
    const key = `${crate.x},${crate.y}`;
    let isOnWaterFlow = waterFlowTiles.some(w => w.x === crate.x && w.y === crate.y);
    const crateId = `${crate.x},${crate.y}`;  // original key

    // Check if this crate is already flowing (regardless of position)
    let isCrateAlreadyFlowing = Object.values(flowingCrates).some(entry => entry.crate === crate);

    if (isOnWaterFlow && !isCrateAlreadyFlowing) {

      const crateRef = crate;
      const pushEl = $(`#game-border .push[data-x='${crate.x}'][data-y='${crate.y}']`);

      const MovementInterval = setInterval(() => {
        const x = crateRef.x;
        const y = crateRef.y;
        const stillOnWaterFlow = waterFlowTiles.some(w => w.x === x && w.y === y);
        console.log(`Looking for waterflow at: ${x} ${y}`);
        const waterEl = $(`.flowingWaterTiles[data-x='${x}'][data-y='${y}']`);
        let directionOfWater = getRotationDegrees(waterEl);
        let fixerX = 0, fixerY = 0;
        if (directionOfWater === 0) fixerX = 1;
        else if (directionOfWater === 180) fixerX = -1;
        else if (directionOfWater === 90) fixerY = 1;
        else if (directionOfWater === 270) fixerY = -1;
        const nextX = x + fixerX;
        const nextY = y + fixerY;
        if (stillOnWaterFlow && checkCollision(nextX, nextY)) {
          crateRef.x = nextX;
          crateRef.y = nextY;
          pushEl.attr('data-x', nextX).attr('data-y', nextY);
          pushEl.css('left', nextX * 64 + 'px');
          pushEl.css('top', nextY * 64 + 'px');
        }
        const stillOnFlow = waterFlowTiles.some(w => w.x === crateRef.x && w.y === crateRef.y);
        if (!stillOnFlow) {
          clearInterval(MovementInterval);
          for (let key in flowingCrates) {
            if (flowingCrates[key].crate === crateRef) {
              delete flowingCrates[key];
              break;
            }
          }
        }
        prevTargetX = null;
        prevTargetY = null;
      }, 500);

      const flowKey = `${crateRef.x},${crateRef.y}`; // Initial position key, for tracking
      flowingCrates[flowKey] = { MovementInterval, crate: crateRef };
    }
    if (isOnWater && !sinkingCrates[key]) {
      const crateSelector = `#game-border .push[data-x='${crate.x}'][data-y='${crate.y}'] img`;
      const $img = $(crateSelector);
      let widthA = $img.width();
      let heightA = $img.height();
      const shrinkInterval = setInterval(() => {
        widthA *= 0.95;
        heightA *= 0.95;
        $img.css({ width: `${widthA}px`, height: `${heightA}px`});
      }, 500);
      const sinkTimeout = setTimeout(() => {
        clearInterval(shrinkInterval);
        clearInterval(checkInterval);  // Make sure to stop checking if sink completes
        pushableTiles = pushableTiles.filter(c => !(c.x === crate.x && c.y === crate.y));
        $(`#game-border .push[data-x='${crate.x}'][data-y='${crate.y}']`).remove();
        delete sinkingCrates[key];
        prevTargetX = null;
        prevTargetY = null;
      }, 10000);

      // Check if crate is still on water every 200ms
      const checkInterval = setInterval(() => {
        const stillOnWater = waterTiles.some(w => w.x === crate.x && w.y === crate.y);
        if (!stillOnWater) {
          // Reset styles
          $img.css({ width: '64px', height: '64px'
            
          });
          // Clear timers
          clearTimeout(sinkTimeout);
          clearInterval(shrinkInterval);
          clearInterval(checkInterval);
          delete sinkingCrates[key];
        }
      }, 200);

      // Save all timers so they can be cleared later
      sinkingCrates[key] = { sinkTimeout, shrinkInterval, checkInterval };
    }

    
  });
  const currentlyOnFlowingWater = waterFlowTiles.some(tile => tile.x === pos.x && tile.y === pos.y);
  //char water stuff below...
  if (currentlyOnFlowingWater && !isOnFlowingWater) {
    isOnFlowingWater = true;
    flowingInterval = setInterval(() => {
      const waterEl = $(`.flowingWaterTiles[data-x='${pos.x}'][data-y='${pos.y}']`);
      let directionOfWater = getRotationDegrees(waterEl);
      let fixerX = 0, fixerY = 0;
      if (directionOfWater === 0) fixerX = 1;
      else if (directionOfWater === 180) fixerX = -1;
      else if (directionOfWater === 90) fixerY = 1;
      else if (directionOfWater === 270) fixerY = -1;
      let newX = pos.x + fixerX;
      let newY = pos.y + fixerY;
      if (checkCollision(newX, newY)) {

        pos.x += fixerX;
        pos.y += fixerY;
        updateCamera();
      }
    }, 500);
  }
  if (!currentlyOnFlowingWater && isOnFlowingWater) {
    clearInterval(flowingInterval);
    flowingInterval = null;
    isOnFlowingWater = false;
  }
  if (currentlyOnWater && !isOnWater) {
    isOnWater = true;
    const face = $('#faceimg');
    if (originalWidth === null || originalHeight === null) {
      originalWidth = face.width();
      originalHeight = face.height();
    }
    shrinkInterval = setInterval(() => {
      cooldownTime *= 1.5;
      face.width(face.width() * 0.9);
      face.height(face.height() * 0.9);
      brightnessLevel -= 0.075;
      if (brightnessLevel < 0) brightnessLevel = 0;
      face.css('filter', `brightness(${brightnessLevel})`);
    }, 500);

    drownTimer = setTimeout(() => {
      cooldownTime = OgCoolDownTime;
      console.log("☠️ Player drowned!");
      setViewTo(startX, startY);
      face.width(originalWidth);
      face.height(originalHeight);
      face.css('filter', 'brightness(1)');
      brightnessLevel = 1;
      clearInterval(shrinkInterval);
      drownTimer = null;
      isOnWater = false;
    }, 5000);
  }
  if (!currentlyOnWater && isOnWater) {
    cooldownTime = OgCoolDownTime;
    const face = $('#faceimg');
    isOnWater = false;
    clearTimeout(drownTimer);
    clearInterval(shrinkInterval);
    drownTimer = null;
    face.css('filter', 'brightness(1)');
    brightnessLevel = 1;
    face.width(originalWidth);
    face.height(originalHeight);
  }
 //#endregion
  requestAnimationFrame(gameLoop);
}
gameLoop();
$(document).keydown(function(event) {
  if (IfCrateSelected && event.key.toLowerCase() === 'e') {
    const sinkKey = `${CrateSelected.x},${CrateSelected.y}`;
    if (sinkingCrates[sinkKey]) {
      clearTimeout(sinkingCrates[sinkKey]);
      delete sinkingCrates[sinkKey];
    }
    pushableTiles = pushableTiles.filter(tile => !(tile.x === CrateSelected.x && tile.y === CrateSelected.y));
    console.log('Crate removed:', CrateSelected, CrateSelected.x, CrateSelected.y);
    $(`#game-border .push[data-x='${CrateSelected.x}'][data-y='${CrateSelected.y}']`).remove();
    IfCrateSelected = false;
    CrateSelected = {};
    prevTargetX = null;  // Force selector refresh
    prevTargetY = null;
    $('.selector').remove();
  }
});