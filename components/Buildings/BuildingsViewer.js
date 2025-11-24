function BuildingsViewer() {
  const [selectedBuilding, setSelectedBuilding] = React.useState(null);
  const [searchTerm, setSearchTerm] = React.useState('');
  const [draggedBuilding, setDraggedBuilding] = React.useState(null);
  const [previewPosition, setPreviewPosition] = React.useState(null);
  const [wasDraggedFromGrid, setWasDraggedFromGrid] = React.useState(false);
  const [draggedInstanceId, setDraggedInstanceId] = React.useState(null);
  const [mousePosition, setMousePosition] = React.useState({ x: 0, y: 0 });
  const [placementError, setPlacementError] = React.useState(null);
  const [leftColWidth, setLeftColWidth] = React.useState(300);
  const isResizing = React.useRef(false);

  const {
    placedBuildings,
    setPlacedBuildings,
    occupiedCells,
    setOccupiedCells,
    placeBuilding,
    removeBuilding,
    getOccupiedPositions: getOccupiedPos
  } = useBuildings();

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

  // Global drop handler for dropping anywhere outside the grid
  const handleGlobalDrop = (e) => {
    e.preventDefault();
    if (!draggedBuilding) return;

    // If dropped outside the grid (and not caught by handleDrop), remove building if it was from grid
    if (wasDraggedFromGrid && draggedInstanceId) {
      removeBuilding(draggedInstanceId);
      setPreviewPosition(null);
      setDraggedBuilding(null);
      setWasDraggedFromGrid(false);
      setDraggedInstanceId(null);
    }
  };

  // Global drag over handler to allow dropping anywhere
  const handleGlobalDragOver = (e) => {
    e.preventDefault();
  };

  React.useEffect(() => {
    if (placementError) {
      const timer = setTimeout(() => {
        setPlacementError(null);
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [placementError]);

  const allItems = React.useMemo(() => {
    const buildings = window.buildingsData.buildings || [];
    const tiles = window.buildingsData.resource_tiles || [];
    return [...buildings, ...tiles];
  }, []);

  const buildingsByCategory = React.useMemo(() => {
    const cats = {};
    allItems.forEach(b => {
      if (!cats[b.category]) {
        cats[b.category] = [];
      }
      cats[b.category].push(b);
    });
    // Sort categories for consistent order
    const sortedCats = {};
    const categoryOrder = [
      "Economy", "Warfare", "Housing", "Resource",
      "Trophy"
    ];

    categoryOrder.forEach(cat => {
      if (cats[cat]) {
        sortedCats[cat] = cats[cat];
      }
    });

    // Add any other categories not in the predefined order
    Object.keys(cats).forEach(cat => {
      if (!sortedCats[cat]) {
        sortedCats[cat] = cats[cat];
      }
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
      if (matching.length > 0) {
        filtered[category] = matching;
      }
    }
    return filtered;
  }, [searchTerm, buildingsByCategory]);

  // Drag and drop functions
  const handleDragStart = (e, building, fromGrid = false, instanceId = null) => {
    setDraggedBuilding(building);
    setWasDraggedFromGrid(fromGrid);
    setDraggedInstanceId(instanceId);
    e.dataTransfer.setData('text/plain', building.name);
    e.dataTransfer.effectAllowed = fromGrid ? 'move' : 'copy';
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
    const gridElement = document.getElementById('buildingGrid');
    if (!gridElement || !draggedBuilding) return;

    const rect = gridElement.getBoundingClientRect();
    const x = e.clientX - rect.left + gridElement.scrollLeft;
    const y = e.clientY - rect.top + gridElement.scrollTop;

    const cellWidth = 30;
    const cellHeight = 30;
    const buildingWidth = draggedBuilding.size?.w ?? 2;
    const buildingHeight = draggedBuilding.size?.h ?? 2;

    let col = Math.floor(x / cellWidth);
    let row = Math.floor(y / cellHeight);

    col = Math.max(0, Math.min(40 - buildingWidth, col));
    row = Math.max(0, Math.min(30 - buildingHeight, row));

    const placementCheck = placeBuilding(row, col, draggedBuilding, wasDraggedFromGrid, draggedInstanceId)
      ? { canPlace: true }
      : { canPlace: false, reason: 'occupied' };

    if (placementCheck.canPlace) {
      setPreviewPosition({ row, col });
      setPlacementError(null);
    } else {
      setPreviewPosition(null);
      if (placementCheck.reason === 'limit-reached') {
        setPlacementError('You can only place one of this building.');
      } else {
        setPlacementError(null);
      }
    }
  };

  const handleDragLeave = (e) => {
    // Only clear if we're actually leaving the container, not just entering a child
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
      const placementCheck = placeBuilding(previewPosition.row, previewPosition.col, draggedBuilding, wasDraggedFromGrid, draggedInstanceId);
      if (placementCheck) {
        // Success
      } else {
        setPlacementError('You can only place one of this building.');
      }
    }

    setPreviewPosition(null);
    setDraggedBuilding(null);
    setWasDraggedFromGrid(false);
    setDraggedInstanceId(null);
  };

  // Track mouse position for tooltip
  React.useEffect(() => {
    const handleMouseMove = (e) => {
      setMousePosition({ x: e.clientX, y: e.clientY });
    };

    document.addEventListener('mousemove', handleMouseMove);

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
    };
  }, []);

  const selectedBuildingData = React.useMemo(() => {
    if (!selectedBuilding) return null;
    return allItems.find(item => item.name === selectedBuilding);
  }, [selectedBuilding, allItems]);

  const hoveredBuildingData = React.useMemo(() => {
    if (!hoveredBuilding || selectedBuilding) return null; // Only show hover tooltip if no building is selected
    return allItems.find(item => item.name === hoveredBuilding);
  }, [hoveredBuilding, selectedBuilding, allItems]);

  const [hoveredBuilding, setHoveredBuilding] = React.useState(null);

  return React.createElement(
    'div',
    {
      className: "flex h-[84vh] bg-slate-900",
      onDrop: handleGlobalDrop,
      onDragOver: handleGlobalDragOver
    },
    // Left Column - Scrollable Building List
    React.createElement(BuildingList, {
      buildingsByCategory,
      filteredCategories,
      selectedBuilding,
      onSelect: setSelectedBuilding,
      searchTerm,
      setSearchTerm,
      allItems,
      onHover: setHoveredBuilding,
      currentHovered: hoveredBuilding
    }),

    // Resize Handle
    React.createElement(
      'div',
      {
        className: "w-1 bg-slate-700 hover:bg-blue-500 cursor-col-resize flex-shrink-0 transition-colors",
        onMouseDown: startResizing
      }
    ),

    // Right Column - Building Grid (with stable size)
    React.createElement(
      'div',
      { className: "flex-1 bg-slate-900 p-2 flex flex-col h-full min-h-0 overflow-hidden" },
      React.createElement(BuildingGrid, {
        placedBuildings,
        previewPosition,
        error: placementError,
        handleDragOver,
        handleDragLeave,
        handleDrop,
        handleDragStart,
        getOccupiedPositions: getOccupiedPos,
        draggedBuilding,
        wasDraggedFromGrid,
        draggedInstanceId,
        onPlace: placeBuilding,
        onRemove: removeBuilding
      })
    ),

    // Mouse Position Tooltip Overlay
    selectedBuildingData && !draggedBuilding && React.createElement(BuildingTooltip, {
      selectedBuildingData,
      mousePosition
    }),
    // Hover tooltip (when no building is selected)
    hoveredBuildingData && !selectedBuilding && !draggedBuilding && React.createElement(BuildingTooltip, {
      selectedBuildingData: hoveredBuildingData,
      mousePosition
    })
  );
}