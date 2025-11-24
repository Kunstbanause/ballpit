function useBuildings() {
  const [placedBuildings, setPlacedBuildings] = React.useState([]);
  const [occupiedCells, setOccupiedCells] = React.useState(() =>
    Array(30 * 40).fill(false)
  );

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

    const width = building.size?.w ?? 2;
    const height = building.size?.h ?? 2;

    if (col + width > 40 || row + height > 30) return { canPlace: false, reason: 'out-of-bounds' };

    const positions = getOccupiedPositions(row, col, width, height);

    for (const pos of positions) {
      if (occupiedCells[pos]) {
        if (fromGrid && instanceIdToDrag) {
          const existingBuilding = placedBuildings.find(pb => pb.instanceId === instanceIdToDrag);
          if (existingBuilding) {
            const existingPositions = getOccupiedPositions(existingBuilding.row, existingBuilding.col, existingBuilding.building.size?.w ?? 2, existingBuilding.building.size?.h ?? 2);
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
          const { w, h } = buildingToMove.building.size || { w: 2, h: 2 };
          getOccupiedPositions(buildingToMove.row, buildingToMove.col, w, h).forEach(pos => {
            newOccupiedCells[pos] = false;
          });
        }
      }
      const { w, h } = building.size || { w: 2, h: 2 };
      getOccupiedPositions(row, col, w, h).forEach(pos => {
        newOccupiedCells[pos] = true;
      });
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
          const { w, h } = buildingToRemove.building.size || { w: 2, h: 2 };
          getOccupiedPositions(buildingToRemove.row, buildingToRemove.col, w, h).forEach(pos => {
            newOccupiedCells[pos] = false;
          });
          return newOccupiedCells;
        });
      }
      return prev.filter(pb => pb.instanceId !== instanceId);
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