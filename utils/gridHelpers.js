// Grid helpers for building placement
function getOccupiedPositions(topLeftRow, topLeftCol, width = 2, height = 2) {
  const positions = [];
  for (let r = 0; r < height; r++) {
    for (let c = 0; c < width; c++) {
      positions.push((topLeftRow + r) * 40 + (topLeftCol + c));
    }
  }
  return positions;
}