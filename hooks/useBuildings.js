// Global variable to maintain building layout across component unmounts
window.globalBuildingLayout = window.globalBuildingLayout || {
  placedBuildings: [],
  occupiedCells: Array(30 * 40).fill(false)
};

function useBuildings() {
  const [placedBuildings, setPlacedBuildings] = React.useState(window.globalBuildingLayout.placedBuildings);
  const [occupiedCells, setOccupiedCells] = React.useState(window.globalBuildingLayout.occupiedCells);

  const getOccupiedPositions = (topLeftRow, topLeftCol, building) => {
    const positions = [];
    if (building.shape) {
      for (const part of building.shape) {
        const c = part[0] - 1;
        const r = part[1] - 1;
        positions.push((topLeftRow + r) * 40 + (topLeftCol + c));
      }
    } else {
      // Fallback for items without a shape property, like resource tiles.
      const width = building.size?.w ?? 2;
      const height = building.size?.h ?? 2;
      for (let r = 0; r < height; r++) {
        for (let c = 0; c < width; c++) {
          positions.push((topLeftRow + r) * 40 + (topLeftCol + c));
        }
      }
    }
    return positions;
  };

  const canPlaceBuilding = React.useCallback((row, col, building, fromGrid, instanceIdToDrag) => {
    if (building.max_placeable === 1) {
      let count = placedBuildings.filter(pb => pb.building.name === building.name).length;
      if (fromGrid && instanceIdToDrag) {
        const isSameBuilding = placedBuildings.some(pb => pb.instanceId === instanceIdToDrag && pb.building.name === building.name);
        if (isSameBuilding) {
          count--;
        }
      }
      if (count >= building.max_placeable) {
        return { canPlace: false, reason: 'limit-reached' };
      }
    }

    let width, height;
    if (building.shape) {
        width = Math.max(0, ...building.shape.map(p => p[0]));
        height = Math.max(0, ...building.shape.map(p => p[1]));
    } else {
        width = building.size?.w ?? 2;
        height = building.size?.h ?? 2;
    }

    if (col + width > 40 || row + height > 30) return { canPlace: false, reason: 'out-of-bounds' };

    const positions = getOccupiedPositions(row, col, building);

    for (const pos of positions) {
      if (occupiedCells[pos]) {
        if (fromGrid && instanceIdToDrag) {
          const existingBuilding = placedBuildings.find(pb => pb.instanceId === instanceIdToDrag);
          if (existingBuilding) {
            const existingPositions = getOccupiedPositions(existingBuilding.row, existingBuilding.col, existingBuilding.building);
            if (existingPositions.includes(pos)) {
              // This position is part of the building we are dragging, so it's okay.
              continue;
            }
          }
        }
        // The position is occupied by another building.
        return { canPlace: false, reason: 'occupied' };
      }
    }
    return { canPlace: true, reason: null };
  }, [placedBuildings, occupiedCells]);

  const placeBuilding = React.useCallback((row, col, building, fromGrid, instanceIdToDrag) => {
    const placementCheck = canPlaceBuilding(row, col, building, fromGrid, instanceIdToDrag);
    if (!placementCheck.canPlace) return false;

    const topLeftIndex = row * 40 + col;

    setOccupiedCells(prev => {
      const newOccupiedCells = [...prev];
      if (fromGrid && instanceIdToDrag) {
        const buildingToMove = placedBuildings.find(pb => pb.instanceId === instanceIdToDrag);
        if (buildingToMove) {
          getOccupiedPositions(buildingToMove.row, buildingToMove.col, buildingToMove.building).forEach(pos => {
            newOccupiedCells[pos] = false;
          });
        }
      }
      getOccupiedPositions(row, col, building).forEach(pos => {
        newOccupiedCells[pos] = true;
      });

      // Update the global state
      window.globalBuildingLayout.occupiedCells = newOccupiedCells;
      return newOccupiedCells;
    });

    setPlacedBuildings(prev => {
      const newPlacedBuildings = [...prev];
      if (fromGrid && instanceIdToDrag) {
        const index = newPlacedBuildings.findIndex(pb => pb.instanceId === instanceIdToDrag);
        if (index !== -1) {
          newPlacedBuildings[index] = {
            ...newPlacedBuildings[index],
            row,
            col,
            topLeftIndex,
          };
          // Update the global state
          window.globalBuildingLayout.placedBuildings = newPlacedBuildings;
          return newPlacedBuildings;
        }
      }

      const instanceId = `${building.name}_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
      newPlacedBuildings.push({
        instanceId,
        building,
        topLeftIndex,
        row,
        col
      });

      // Update the global state
      window.globalBuildingLayout.placedBuildings = newPlacedBuildings;
      return newPlacedBuildings;
    });

    return true;
  }, [canPlaceBuilding, placedBuildings]);

  const removeBuilding = React.useCallback((instanceId) => {
    setPlacedBuildings(prev => {
      const buildingToRemove = prev.find(pb => pb.instanceId === instanceId);
      if (buildingToRemove) {
        setOccupiedCells(occupied => {
          const newOccupiedCells = [...occupied];
          getOccupiedPositions(buildingToRemove.row, buildingToRemove.col, buildingToRemove.building).forEach(pos => {
            newOccupiedCells[pos] = false;
          });

          // Update the global state
          window.globalBuildingLayout.occupiedCells = newOccupiedCells;
          return newOccupiedCells;
        });
      }
      const newPlacedBuildings = prev.filter(pb => pb.instanceId !== instanceId);

      // Update the global state
      window.globalBuildingLayout.placedBuildings = newPlacedBuildings;
      return newPlacedBuildings;
    });
  }, []);

  return {
    placedBuildings,
    setPlacedBuildings,
    occupiedCells,
    setOccupiedCells,
    placeBuilding,
    removeBuilding,
    canPlaceBuilding,
    getOccupiedPositions
  };
}

// Export for Babel Standalone
window.useBuildings = useBuildings;