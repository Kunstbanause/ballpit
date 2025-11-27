function BuildingsViewer() {
  const [selectedBuilding, setSelectedBuilding] = React.useState(null);
  const [draggedBuildingRotation, setDraggedBuildingRotation] = React.useState(0);

  // Function to serialize placed buildings to URL hash
  const serializeBuildingsToHash = React.useCallback((buildings) => {
    if (!buildings || buildings.length === 0) return '';
    const serializedData = buildings.map(b => ({
      name: b.building.name,
      row: b.row,
      col: b.col,
      rotation: b.rotation || 0
    }));
    const jsonString = JSON.stringify(serializedData);
    return `buildings-${btoa(encodeURIComponent(jsonString))}`;
  }, []);

  // Function to deserialize buildings from URL hash
  const deserializeBuildingsFromHash = React.useCallback((hash) => {
    if (!hash || !hash.startsWith('buildings-')) return null;
    try {
      const encoded = hash.substring(10);
      const jsonString = decodeURIComponent(atob(encoded));
      const parsedData = JSON.parse(jsonString);
      return parsedData.map((b, index) => {
        const buildingData = window.buildingsData?.buildings?.find(building => building.name === b.name) ||
                            window.buildingsData?.resource_tiles?.find(tile => tile.name === b.name);
        return {
          instanceId: `${b.name}_${Date.now()}_${index}`,
          building: buildingData || { name: b.name },
          topLeftIndex: b.row * 40 + b.col,
          row: b.row,
          col: b.col,
          rotation: b.rotation || 0
        };
      });
    } catch (error) {
      console.error('Error deserializing buildings from hash:', error);
      return null;
    }
  }, []);

  const [searchTerm, setSearchTerm] = React.useState('');
  const [draggedBuilding, setDraggedBuilding] = React.useState(null);
  const [previewPosition, setPreviewPosition] = React.useState(null);
  const [wasDraggedFromGrid, setWasDraggedFromGrid] = React.useState(false);
  const [draggedInstanceId, setDraggedInstanceId] = React.useState(null);
  const [mousePosition, setMousePosition] = React.useState({ x: 0, y: 0 });
  const [placementError, setPlacementError] = React.useState(null);
  const [leftColWidth, setLeftColWidth] = React.useState(300);
  const [showConfirm, setShowConfirm] = React.useState(false);
  const isResizing = React.useRef(false);

  const {
    placedBuildings,
    setPlacedBuildings,
    occupiedCells,
    setOccupiedCells,
    placeBuilding,
    removeBuilding,
    canPlaceBuilding,
    getOccupiedPositions: getOccupiedPos,
    rotateShape
  } = useBuildings();

    React.useEffect(() => {
        const handleKeyDown = (e) => {
            if ((e.key === 'r' || e.key === 'R') && draggedBuilding) {
                e.preventDefault();
                setDraggedBuildingRotation(prev => (prev + 1) % 4);
            }
        };
        document.addEventListener('keydown', handleKeyDown);
        return () => document.removeEventListener('keydown', handleKeyDown);
    }, [draggedBuilding]);

  const startResizing = React.useCallback(() => {
    isResizing.current = true;
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
  }, []);

  const stopResizing = React.useCallback(() => {
    isResizing.current = false;
    document.body.style.cursor = '';
    document.body.style.userSelect = '';
  }, []);

  const resize = React.useCallback((e) => {
    if (isResizing.current) {
      const newWidth = e.clientX;
      if (newWidth >= 200 && newWidth <= 600) {
        setLeftColWidth(newWidth);
      }
    }
  }, []);

  React.useEffect(() => {
    window.addEventListener('mousemove', resize);
    window.addEventListener('mouseup', stopResizing);
    return () => {
      window.removeEventListener('mousemove', resize);
      window.removeEventListener('mouseup', stopResizing);
    };
  }, [resize, stopResizing]);

  const handleGlobalDrop = (e) => {
    e.preventDefault();
    if (!draggedBuilding) return;
    if (wasDraggedFromGrid && draggedInstanceId) {
      removeBuilding(draggedInstanceId);
    }
    setPreviewPosition(null);
    setDraggedBuilding(null);
    setWasDraggedFromGrid(false);
    setDraggedInstanceId(null);
    setDraggedBuildingRotation(0);
  };

  const handleGlobalDragOver = (e) => e.preventDefault();

  const clearLayout = () => {
    if (!showConfirm) {
      // First click - show confirmation text
      setShowConfirm(true);
    } else {
      // Second confirmed click - clear the layout
      setPlacedBuildings([]);
      setOccupiedCells(Array(30 * 40).fill(false));

      // Clear localStorage
      localStorage.removeItem('buildingLayout');

      // Clear URL hash if it's related to buildings
      const currentHash = window.location.hash.slice(1);
      if (currentHash === 'buildings' || currentHash.startsWith('buildings-')) {
        window.history.replaceState(null, '', window.location.pathname);
      }

      // Update global layout
      window.globalBuildingLayout = {
        placedBuildings: [],
        occupiedCells: Array(30 * 40).fill(false)
      };

      // Reset confirmation state
      setShowConfirm(false);
    }
  };

  React.useEffect(() => {
    if (placementError) {
      const timer = setTimeout(() => setPlacementError(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [placementError]);

  const [hasLoadedFromUrl, setHasLoadedFromUrl] = React.useState(false);

  React.useEffect(() => {
    if (!hasLoadedFromUrl) {
      let loadedBuildings = deserializeBuildingsFromHash(window.location.hash.slice(1));
      if (!loadedBuildings || loadedBuildings.length === 0) {
        try {
          const localStorageData = localStorage.getItem('buildingLayout');
          if (localStorageData) {
            loadedBuildings = JSON.parse(localStorageData).map((b, index) => {
              const buildingData = window.buildingsData?.buildings?.find(bg => bg.name === b.building.name) ||
                                  window.buildingsData?.resource_tiles?.find(rt => rt.name === b.building.name);
              return { ...b, instanceId: `${b.building.name}_${Date.now()}_${index}`, building: buildingData || b.building };
            });
          }
        } catch (error) { console.error('Error loading layout from localStorage:', error); }
      }

      if (loadedBuildings && loadedBuildings.length > 0) {
        setPlacedBuildings(loadedBuildings);
        const newOccupiedCells = Array(30 * 40).fill(false);
        loadedBuildings.forEach(b => {
          const positions = getOccupiedPos(b.row, b.col, b.building, b.rotation);
          positions.forEach(pos => {
            if (pos >= 0 && pos < newOccupiedCells.length) newOccupiedCells[pos] = true;
          });
        });
        setOccupiedCells(newOccupiedCells);
      }
      setHasLoadedFromUrl(true);
    }
  }, [hasLoadedFromUrl, deserializeBuildingsFromHash, getOccupiedPos, setPlacedBuildings, setOccupiedCells]);

  React.useEffect(() => {
    if (window.urlUpdateTimeout) clearTimeout(window.urlUpdateTimeout);
    window.urlUpdateTimeout = setTimeout(() => {
      try {
        localStorage.setItem('buildingLayout', JSON.stringify(placedBuildings.map(b => ({ building: b.building, row: b.row, col: b.col, rotation: b.rotation }))));
      } catch (error) { console.error('Error saving to localStorage:', error); }
      
      const currentHash = window.location.hash.slice(1);
      if (currentHash === 'buildings' || currentHash.startsWith('buildings-')) {
        const layoutHash = serializeBuildingsToHash(placedBuildings);
        const newUrl = layoutHash ? `${window.location.pathname}#${layoutHash}` : `${window.location.pathname}#buildings`;
        if (window.location.href !== newUrl) {
            window.history.replaceState(null, '', newUrl);
        }
      }
    }, 500);
    return () => { if (window.urlUpdateTimeout) clearTimeout(window.urlUpdateTimeout); };
  }, [placedBuildings, serializeBuildingsToHash]);

  const allItems = React.useMemo(() => [...(window.buildingsData.buildings || []), ...(window.buildingsData.resource_tiles || [])], []);

  const buildingsByCategory = React.useMemo(() => {
    const cats = {};
    allItems.forEach(b => {
      if (!cats[b.category]) cats[b.category] = [];
      cats[b.category].push(b);
    });
    const sortedCats = {};
    ["Economy", "Warfare", "Housing", "Resource", "Trophy"].forEach(cat => {
      if (cats[cat]) sortedCats[cat] = cats[cat];
    });
    Object.keys(cats).forEach(cat => {
      if (!sortedCats[cat]) sortedCats[cat] = cats[cat];
    });
    return sortedCats;
  }, [allItems]);

  const filteredCategories = React.useMemo(() => {
    if (!searchTerm) return buildingsByCategory;
    const lowerSearch = searchTerm.toLowerCase();
    const filtered = {};
    for (const category in buildingsByCategory) {
      const matching = buildingsByCategory[category].filter(b =>
        b.name.toLowerCase().includes(lowerSearch) ||
        b.description.toLowerCase().includes(lowerSearch) ||
        b.category.toLowerCase().includes(lowerSearch)
      );
      if (matching.length > 0) filtered[category] = matching;
    }
    return filtered;
  }, [searchTerm, buildingsByCategory]);

  const handleDragStart = (e, building, fromGrid = false, instanceId = null) => {
    setDraggedBuilding(building);
    setWasDraggedFromGrid(fromGrid);
    setDraggedInstanceId(instanceId);
    if(fromGrid) {
        const existing = placedBuildings.find(pb => pb.instanceId === instanceId);
        if(existing) setDraggedBuildingRotation(existing.rotation || 0);
    } else {
        setDraggedBuildingRotation(0);
    }
    e.dataTransfer.setData('text/plain', building.name);
    e.dataTransfer.effectAllowed = fromGrid ? 'move' : 'copy';
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
    const gridElement = document.getElementById('buildingGrid');
    if (!gridElement || !draggedBuilding) return;

    const rect = gridElement.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const scrollAdjustedX = x + gridElement.scrollLeft;
    const scrollAdjustedY = y + gridElement.scrollTop;

    const cellWidth = 30;
    const cellHeight = 30;

    const rotatedShape = draggedBuilding.shape ? rotateShape(draggedBuilding.shape, draggedBuildingRotation) : null;
    const buildingWidth = rotatedShape ? Math.max(0, ...rotatedShape.map(p => p[0])) : (draggedBuilding.size?.w ?? 2);
    const buildingHeight = rotatedShape ? Math.max(0, ...rotatedShape.map(p => p[1])) : (draggedBuilding.size?.h ?? 2);

    let col = Math.floor(scrollAdjustedX / cellWidth);
    let row = Math.floor(scrollAdjustedY / cellHeight);

    col = Math.max(0, Math.min(40 - buildingWidth, col));
    row = Math.max(0, Math.min(30 - buildingHeight, row));

    const newPosition = { row, col };
    if (!previewPosition || previewPosition.row !== row || previewPosition.col !== col) {
      const placementCheck = canPlaceBuilding(row, col, draggedBuilding, wasDraggedFromGrid, draggedInstanceId, draggedBuildingRotation);
      if (placementCheck.canPlace) {
        setPreviewPosition(newPosition);
        setPlacementError(null);
      } else {
        setPreviewPosition(null);
        setPlacementError(null);
      }
    }
  };

  const handleDragLeave = (e) => {
    const container = e.currentTarget;
    if (!container.contains(e.relatedTarget)) {
      setPreviewPosition(null);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (!draggedBuilding) return;

    if (previewPosition) {
      placeBuilding(previewPosition.row, previewPosition.col, draggedBuilding, wasDraggedFromGrid, draggedInstanceId, draggedBuildingRotation);
    }

    setPreviewPosition(null);
    setDraggedBuilding(null);
    setWasDraggedFromGrid(false);
    setDraggedInstanceId(null);
    setDraggedBuildingRotation(0);
  };

  React.useEffect(() => {
    const handleMouseMove = (e) => setMousePosition({ x: e.clientX, y: e.clientY });
    document.addEventListener('mousemove', handleMouseMove);
    return () => document.removeEventListener('mousemove', handleMouseMove);
  }, []);

  const [hoveredBuilding, setHoveredBuilding] = React.useState(null);
  const hoveredBuildingData = React.useMemo(() => allItems.find(item => item.name === hoveredBuilding), [hoveredBuilding, allItems]);

  return React.createElement(
    'div', { className: "flex flex-col bg-slate-900", onDrop: handleGlobalDrop, onDragOver: handleGlobalDragOver },
    React.createElement(
      'div', { className: "p-2 bg-slate-800 flex justify-between items-center" },
      //React.createElement('h2', { className: "text-lg font-bold text-white" }, "Building Layout"),
      React.createElement('button', {
        className: "bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-md transition-colors text-sm font-medium min-w-[120px]",
        onClick: clearLayout,
        onMouseLeave: () => setShowConfirm(false)
      }, showConfirm ? "Really?" : "Clear Layout")
    ),
    React.createElement(
      'div', { className: "flex flex-1 gap-0", style: { maxHeight: '80vh' } },
      React.createElement('div', { className: "bg-slate-800 border-r border-slate-700 flex flex-col", style: { width: leftColWidth } },
        React.createElement(BuildingList, { buildingsByCategory, filteredCategories, selectedBuilding, onSelect: setSelectedBuilding, searchTerm, setSearchTerm, allItems, onHover: setHoveredBuilding, currentHovered: hoveredBuilding, onDragStartFromList: handleDragStart })
      ),
      React.createElement('div', { className: "w-1 bg-slate-700 hover:bg-blue-500 cursor-col-resize flex-shrink-0 transition-colors", onMouseDown: startResizing }),
      React.createElement('div', { className: "flex flex-col flex-1 bg-slate-900", style: { minWidth: 0 } },
        React.createElement(BuildingGrid, { placedBuildings, previewPosition, error: placementError, handleDragOver, handleDragLeave, handleDrop, handleDragStart, onBuildingHover: setHoveredBuilding, onBuildingLeave: () => setHoveredBuilding(null), getOccupiedPositions: getOccupiedPos, draggedBuilding, wasDraggedFromGrid, draggedInstanceId, draggedBuildingRotation, rotateShape, onRemove: removeBuilding })
      ),
      hoveredBuildingData && !draggedBuilding && React.createElement(BuildingTooltip, { selectedBuildingData: hoveredBuildingData, mousePosition })
    )
  );
}