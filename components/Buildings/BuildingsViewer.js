function BuildingsViewer() {
  const [selectedBuilding, setSelectedBuilding] = React.useState(null);

  // Function to serialize placed buildings to URL hash
  const serializeBuildingsToHash = React.useCallback((buildings) => {
    if (!buildings || buildings.length === 0) {
      return '';
    }

    // Create a simplified representation of the placed buildings
    const serializedData = buildings.map(b => ({
      name: b.building.name,
      row: b.row,
      col: b.col
    }));

    // Convert to JSON string then base64 encode to make it URL-safe
    const jsonString = JSON.stringify(serializedData);
    const encoded = btoa(encodeURIComponent(jsonString));

    // Create a short identifier for the hash
    return `buildings-${encoded}`;
  }, []);

  // Function to deserialize buildings from URL hash
  const deserializeBuildingsFromHash = React.useCallback((hash) => {
    if (!hash || !hash.startsWith('buildings-')) {
      return null;
    }

    try {
      const encoded = hash.substring(10); // Remove 'buildings-' prefix
      const jsonString = decodeURIComponent(atob(encoded));
      const parsedData = JSON.parse(jsonString);

      // Reconstruct the placed buildings with proper structure
      return parsedData.map((b, index) => {
        // Find the actual building data from allItems
        const buildingData = window.buildingsData?.buildings?.find(building => building.name === b.name) ||
                            window.buildingsData?.resource_tiles?.find(tile => tile.name === b.name);

        return {
          instanceId: `${b.name}_${Date.now()}_${index}`, // Generate new instance ID on load
          building: buildingData || { name: b.name }, // Use original data or fallback
          topLeftIndex: b.row * 40 + b.col,
          row: b.row,
          col: b.col
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

  // State to track if we've loaded from URL on this session
  const [hasLoadedFromUrl, setHasLoadedFromUrl] = React.useState(false);

  // Load state from URL hash on first component mount only
  React.useEffect(() => {
    if (!hasLoadedFromUrl) {
      const hash = window.location.hash.slice(1); // Remove the '#' character
      if (hash) {
        const loadedBuildings = deserializeBuildingsFromHash(hash);
        if (loadedBuildings && loadedBuildings.length > 0) {
          // Set the placed buildings to the loaded state
          setPlacedBuildings(loadedBuildings);

          // Recalculate occupied cells based on loaded buildings
          const newOccupiedCells = Array(30 * 40).fill(false);
          loadedBuildings.forEach(building => {
            const { w = 2, h = 2 } = building.building.size || {};
            const positions = getOccupiedPos(building.row, building.col, w, h);
            positions.forEach(pos => {
              if (pos >= 0 && pos < newOccupiedCells.length) {
                newOccupiedCells[pos] = true;
              }
            });
          });
          setOccupiedCells(newOccupiedCells);
        }
      }
      // Mark that we've loaded from URL so this doesn't run again during this session
      setHasLoadedFromUrl(true);
    }
  }, [hasLoadedFromUrl, setPlacedBuildings, setOccupiedCells, deserializeBuildingsFromHash, getOccupiedPos]);

  // No automatic saving to URL anymore - only manual saving

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
    // Calculate mouse position relative to the grid element
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    // Adjust for scrolling within the grid container
    const scrollAdjustedX = x + gridElement.scrollLeft;
    const scrollAdjustedY = y + gridElement.scrollTop;

    const cellWidth = 30;
    const cellHeight = 30;
    const buildingWidth = draggedBuilding.size?.w ?? 2;
    const buildingHeight = draggedBuilding.size?.h ?? 2;

    let col = Math.floor(scrollAdjustedX / cellWidth);
    let row = Math.floor(scrollAdjustedY / cellHeight);

    col = Math.max(0, Math.min(40 - buildingWidth, col));
    row = Math.max(0, Math.min(30 - buildingHeight, row));

    // Only update if position changed to prevent "painting" effect
    const newPosition = { row, col };
    if (!previewPosition || previewPosition.row !== row || previewPosition.col !== col) {
      const placementCheck = placeBuilding(row, col, draggedBuilding, wasDraggedFromGrid, draggedInstanceId)
        ? { canPlace: true }
        : { canPlace: false, reason: 'occupied' };

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
        setPlacementError(null);
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

  const [hoveredBuilding, setHoveredBuilding] = React.useState(null);

  const hoveredBuildingData = React.useMemo(() => {
    if (!hoveredBuilding) return null;
    return allItems.find(item => item.name === hoveredBuilding);
  }, [hoveredBuilding, allItems]);

  // Effect to update URL hash when placedBuildings change with aggressive debouncing
  React.useEffect(() => {
    // Create a more sophisticated debounce mechanism that avoids excessive updates
    if (window.urlUpdateTimeout) {
      clearTimeout(window.urlUpdateTimeout);
    }

    // Only proceed after a delay to ensure we're not in the middle of multiple rapid changes
    window.urlUpdateTimeout = setTimeout(() => {
      // Only update if we're on the buildings page
      const currentHash = window.location.hash.slice(1);
      if (currentHash === 'buildings' || currentHash.startsWith('buildings-')) {
        const layoutHash = serializeBuildingsToHash(placedBuildings);
        if (layoutHash) {
          const newUrl = `${window.location.pathname}#${layoutHash}`;
          window.history.replaceState(null, '', newUrl);
        } else {
          // If no buildings, set back to just #buildings
          if (window.location.hash !== '#buildings') {
            window.history.replaceState(null, '', `${window.location.pathname}#buildings`);
          }
        }
      }
    }, 500); // 500ms delay to ensure user has finished the action

    // Cleanup function
    return () => {
      if (window.urlUpdateTimeout) {
        clearTimeout(window.urlUpdateTimeout);
      }
    };
  }, [placedBuildings, serializeBuildingsToHash]);

  return React.createElement(
    'div',
    {
      className: "flex flex-col bg-slate-900",
      onDrop: handleGlobalDrop,
      onDragOver: handleGlobalDragOver
    },
    // Main content area with resizable columns
    React.createElement(
      'div',
      { className: "flex flex-1 gap-0", style: { maxHeight: '80vh' } }, // Main area that contains the resizable columns with max height
      // Left Column - Scrollable Building List with dynamic width
      React.createElement('div', {
        className: "bg-slate-800 border-r border-slate-700 flex flex-col",
        style: { width: leftColWidth }
      },
        React.createElement(BuildingList, {
          buildingsByCategory,
          filteredCategories,
          selectedBuilding,
          onSelect: setSelectedBuilding,
          searchTerm,
          setSearchTerm,
          allItems,
          onHover: setHoveredBuilding,
          currentHovered: hoveredBuilding,
          onDragStartFromList: handleDragStart
        })
      ), // Close left column div

      // Resize Handle
      React.createElement(
        'div',
        {
          className: "w-1 bg-slate-700 hover:bg-blue-500 cursor-col-resize flex-shrink-0 transition-colors",
          onMouseDown: startResizing
        }
      ),

      // Right Column - Building Grid (with remaining space)
      React.createElement(
        'div',
        { className: "flex flex-col flex-1 bg-slate-900", style: { minWidth: 0 } },
        React.createElement(BuildingGrid, {
          placedBuildings,
          previewPosition,
          error: placementError,
          handleDragOver,
          handleDragLeave,
          handleDrop,
          handleDragStart,
          onBuildingHover: setHoveredBuilding, // Set hovered building when mouse enters a placed building
          onBuildingLeave: () => setHoveredBuilding(null), // Clear hovered building when mouse leaves
          getOccupiedPositions: getOccupiedPos,
          draggedBuilding,
          wasDraggedFromGrid,
          draggedInstanceId,
          onPlace: placeBuilding,
          onRemove: removeBuilding
        })
      ), // Close right column div

      // Hover tooltip (only show when there's a hovered building and not dragging)
      hoveredBuildingData && !draggedBuilding && React.createElement(BuildingTooltip, {
        selectedBuildingData: hoveredBuildingData,
        mousePosition
      })
    ) // Close main flex div
  ); // Close function return
}