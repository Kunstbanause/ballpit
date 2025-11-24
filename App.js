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

// Custom hooks
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

function useBallEvolution() {
  const { evolutions, baseElements, nameMap, uniqueEvos, recipesByEvo, altNodes, baseInfoMap } = React.useMemo(() => {
    const data = window.jsonData;
    const newNameMap = {};
    const allNames = new Set();
    data.evolutions.forEach(e => {
      allNames.add(e.name);
      e.ingredients.forEach(i => allNames.add(i));
    });
    allNames.forEach(name => newNameMap[name.toUpperCase().replace(/\s/g, ' ')] = name);

    const evos = data.evolutions.map(e => ({
      ...e,
      name: e.name.toUpperCase().replace(/\s/g, ' '),
      ingredients: e.ingredients.map(i => i.toUpperCase().replace(/\s/g, ' '))
    }));

    const evoNames = new Set(evos.map(e => e.name));
    const allIngredients = new Set(evos.flatMap(e => e.ingredients));
    const base = [...allIngredients].filter(ing => !evoNames.has(ing));

    // Build a lookup map for base ball metadata from `baseballsData`.
    const baseInfoMap = {};
    try {
      if (typeof window.baseballsData !== 'undefined' && Array.isArray(window.baseballsData.baseBalls)) {
        window.baseballsData.baseBalls.forEach(b => {
          const key = (b.name || '').toUpperCase().replace(/\s/g, ' ');
          baseInfoMap[key] = b;
        });
      }
    } catch (e) {
      // ignore
    }

    const uniqueEvos = [];
    const seenUnique = new Set();
    evos.forEach(evo => {
      if (!seenUnique.has(evo.name)) {
        seenUnique.add(evo.name);
        uniqueEvos.push(evo);
      }
    });

    const recipesByEvo = {};
    // Normalize and deduplicate recipes so mirrored combinations (A+B and B+A)
    // are only shown once per evolution.
    evos.forEach(evo => {
      const name = evo.name;
      const ingredients = evo.ingredients;
      if (!recipesByEvo[name]) recipesByEvo[name] = [];
      const normalized = ingredients.slice().sort().join('||');
      const already = recipesByEvo[name].some(r => r.slice().sort().join('||') === normalized);
      if (!already) recipesByEvo[name].push(ingredients);
    });

    // Collect nodes that participate in alternative (non-primary) recipes
    // so we can style their borders in gold for easier parsing.
    const altNodes = new Set();
    Object.entries(recipesByEvo).forEach(([evoName, recs]) => {
      recs.forEach((rec, idx) => {
        if (idx > 0) {
          altNodes.add(evoName);
          rec.forEach(i => altNodes.add(i));
        }
      });
    });

    return { evolutions: evos, baseElements: base.sort(), nameMap: newNameMap, uniqueEvos, recipesByEvo, altNodes, baseInfoMap };
  }, []);

  const getAncestors = (ballName, allEvolutions) => {
    const ancestors = new Set();
    const toProcess = [ballName];
    const processed = new Set();

    while (toProcess.length > 0) {
      const currentBall = toProcess.pop();
      if (processed.has(currentBall)) continue;
      processed.add(currentBall);

      const recipes = allEvolutions.filter(e => e.name === currentBall);
      recipes.forEach(recipe => {
        recipe.ingredients.forEach(ing => {
          ancestors.add(ing);
          toProcess.push(ing);
        });
      });
    }
    return ancestors;
  };

  const getDescendants = (ballName, allEvolutions) => {
    const descendants = new Set();
    const toProcess = [ballName];
    const processed = new Set();

    while (toProcess.length > 0) {
      const currentBall = toProcess.pop();
      if (processed.has(currentBall)) continue;
      processed.add(currentBall);

      const children = allEvolutions.filter(e => e.ingredients.includes(currentBall));
      children.forEach(child => {
        descendants.add(child.name);
        toProcess.push(child.name);
      });
    }
    return descendants;
  };

  return {
    evolutions,
    baseElements,
    nameMap,
    uniqueEvos,
    recipesByEvo,
    altNodes,
    baseInfoMap,
    getAncestors,
    getDescendants
  };
}

function usePassives() {
  const passiveCategories = {
    "crit": { color: "#ffb703" },
    "baby balls": { color: "#fb8500" },
    "healing": { color: "#d00000" },
    "effigy": { color: "#6a040f" },
    "defense": { color: "#0077b6" },
    "pierce": { color: "#00b4d8" },
    "special": { color: "#8338ec" },
    "damage": { color: "#2d6a4f" },
    "utility": { color: "#588157" },
    "movement": { color: "#4f772d" },
    "on-hit": { color: "#fca311" },
  };

  const base = window.passivesData.basePassives || [];
  const evolved = window.passivesData.evolvedPassives || [];

  // ingredients set
  const ingredientSet = React.useMemo(() => new Set(evolved.flatMap(e => e.ingredients || [])), [evolved]);

  const categoryOrder = [
    'effigy', 'baby balls', 'healing', 'crit', 'damage',
    'defense', 'pierce', 'movement', 'on-hit', 'special', 'utility'
  ];

  const noUpgrade = React.useMemo(() => {
    const unsorted = base.filter(b => !ingredientSet.has(b.name));
    return unsorted.sort((a, b) => {
      const catA = categoryOrder.indexOf(a.category);
      const catB = categoryOrder.indexOf(b.category);
      if (catA === -1 && catB === -1) return a.name.localeCompare(b.name);
      if (catA === -1) return 1;
      if (catB === -1) return -1;
      if (catA !== catB) return catA - catB;
      return a.name.localeCompare(b.name);
    });
  }, [base, ingredientSet, categoryOrder]);

  const hasUpgrade = React.useMemo(() => base.filter(b => ingredientSet.has(b.name)), [base, ingredientSet]);

  const col1 = React.useMemo(() => noUpgrade.filter((_, i) => i % 2 === 0), [noUpgrade]);
  const col2 = React.useMemo(() => noUpgrade.filter((_, i) => i % 2 === 1), [noUpgrade]);
  const col3 = hasUpgrade;
  const col4 = evolved;

  const allNodeNames = React.useMemo(() => Array.from(new Set([...base.map(b => b.name), ...evolved.map(e => e.name)])).sort(), [base, evolved]);

  return {
    passiveCategories,
    base,
    evolved,
    ingredientSet,
    categoryOrder,
    noUpgrade,
    hasUpgrade,
    col1,
    col2,
    col3,
    col4,
    allNodeNames
  };
}

// Presentational components
function BallNode({ name, position, isHighlighted, onClick, nameMap, baseHeight = 45 }) {
  const displayName = nameMap[name] || name;
  const urls = window.helpers.getIconUrls(displayName);
  const imgSize = 36;
  const padding = 5;
  const imgX = position.x + padding;
  const imgY = position.y + (baseHeight - imgSize) / 2;
  const primary = urls[0];

  const textX = position.x + padding + imgSize + padding;
  const textY = position.y + baseHeight / 2;

  const wrapText = (text) => {
    const maxCharsPerLine = 15;
    if (text.length <= maxCharsPerLine) return [text];
    const words = text.split(' ');
    const lines = [];
    let currentLine = '';
    for (const word of words) {
      if ((currentLine + ' ' + word).trim().length > maxCharsPerLine && currentLine.length > 0) {
        lines.push(currentLine);
        currentLine = word;
      } else {
        currentLine = (currentLine + ' ' + word).trim();
      }
    }
    if (currentLine) lines.push(currentLine);
    return lines;
  };
  const lines = wrapText(displayName);

  return React.createElement(
    'g',
    null,
    React.createElement('rect', {
      x: position.x,
      y: position.y,
      width: 140,
      height: baseHeight,
      rx: "4",
      fill: window.helpers.getColor(name),
      stroke: isHighlighted ? '#fff' : 'none',
      strokeWidth: isHighlighted ? 2 : 0,
      opacity: isHighlighted ? 1 : 0.7,
      className: "cursor-pointer transition-all hover:opacity-100",
      onClick: onClick
    }),
    primary && React.createElement('image', {
      href: primary,
      x: imgX,
      y: imgY,
      width: imgSize,
      height: imgSize,
      preserveAspectRatio: "xMidYMid slice",
      onError: (e) => { e.target.style.display = 'none'; },
      className: "pointer-events-none select-none"
    }),
    React.createElement('text', {
      x: textX,
      y: textY - (lines.length > 1 ? (lines.length - 1) * 6 : 0),
      textAnchor: "start",
      dominantBaseline: "middle",
      fontSize: displayName.length > 15 ? "10" : "11",
      fontWeight: "bold",
      fill: "white",
      className: "pointer-events-none select-none"
    }, 
      lines.map((line, i) => 
        React.createElement('tspan', { key: i, x: textX, dy: i === 0 ? 0 : '1.2em' }, line)
      )
    )
  );
}

function PassiveNode({ name, isEvolved = false, position, highlightedChain, passiveCategories, onNodeHover, onNodeLeave, setSelected, selected }) {
  const displayName = name;
  const inChain = highlightedChain.has(name);
  const nodeData = isEvolved 
    ? window.passivesData.evolvedPassives.find(e => e.name === name) 
    : window.passivesData.basePassives.find(b => b.name === name);
  const category = nodeData?.category;
  const categoryColor = category && passiveCategories[category] ? passiveCategories[category].color : null;

  const baseFill = isEvolved ? 'rgba(245,158,11,0.08)' : 'rgba(30,41,59,0.8)';
  const fill = categoryColor ? `${categoryColor}33` : baseFill;
  const opacity = !selected || inChain ? 1 : 0.3;

  const url = window.helpers.getPassiveIconUrl(name);
  const imgSize = 48;
  const imgX = position.x + 6;
  const imgY = position.y + (position.height - imgSize) / 2;

  // wrap name into multiple lines to fit smaller node width
  const paddingLeft = 6 + 48 + 6; // imgX + imgSize + gap
  const maxChars = Math.max(8, Math.floor((position.width - paddingLeft - 12) / 7));
  const words = displayName.split(' ');
  const lines = [];
  let current = '';
  for (let w of words) {
    if ((current + ' ' + w).trim().length > maxChars && current.length > 0) { 
      lines.push(current); 
      current = w; 
    }
    else { 
      current = (current + ' ' + w).trim(); 
    }
  }
  if (current) lines.push(current);

  return React.createElement(
    'g',
    { 
      key: name, 
      transform: `translate(${position.x}, ${position.y})`, 
      style: { opacity: opacity, transition: 'opacity 0.2s' } 
    },
    React.createElement('rect', {
      x: 0, 
      y: 0, 
      rx: 8, 
      ry: 8,
      width: position.width, 
      height: position.height,
      fill: fill,
      stroke: inChain ? '#f59e0b' : (categoryColor || (isEvolved ? '#b45309' : '#374151')),
      strokeWidth: inChain ? 2 : 1,
      onMouseEnter: (ev) => onNodeHover(ev, (isEvolved ? window.passivesData.evolvedPassives.find(e => e.name === name) : window.passivesData.basePassives.find(b => b.name === name))),
      onMouseMove: (ev) => onNodeHover(ev, (isEvolved ? window.passivesData.evolvedPassives.find(e => e.name === name) : window.passivesData.basePassives.find(b => b.name === name))),
      onMouseLeave: onNodeLeave,
      onClick: () => setSelected(selected === name ? null : name),
      style: { cursor: 'pointer' }
    }),
    url && React.createElement('image', {
      href: url, 
      x: 6, 
      y: (position.height - imgSize) / 2, 
      width: imgSize, 
      height: imgSize, 
      preserveAspectRatio: "xMidYMid slice", 
      onError: (e) => { e.target.style.display = 'none'; }, 
      onMouseEnter: (ev) => onNodeHover(ev, (isEvolved ? window.passivesData.evolvedPassives.find(e => e.name === name) : window.passivesData.basePassives.find(b => b.name === name))), 
      onMouseMove: (ev) => onNodeHover(ev, (isEvolved ? window.passivesData.evolvedPassives.find(e => e.name === name) : window.passivesData.basePassives.find(b => b.name === name))), 
      onMouseLeave: onNodeLeave, 
      onClick: () => setSelected(selected === name ? null : name), 
      style: { cursor: 'pointer' }
    }),
    React.createElement('text', {
      x: paddingLeft, 
      y: position.height / 2 - (lines.length - 1) * 6, 
      fill: isEvolved ? '#f59e0b' : '#fff', 
      fontWeight: "600", 
      fontSize: "12", 
      dominantBaseline: "middle", 
      onMouseEnter: (ev) => onNodeHover(ev, (isEvolved ? window.passivesData.evolvedPassives.find(e => e.name === name) : window.passivesData.basePassives.find(b => b.name === name))), 
      onMouseMove: (ev) => onNodeHover(ev, (isEvolved ? window.passivesData.evolvedPassives.find(e => e.name === name) : window.passivesData.basePassives.find(b => b.name === name))), 
      onMouseLeave: onNodeLeave, 
      onClick: () => setSelected(selected === name ? null : name), 
      style: { cursor: 'pointer', userSelect: 'none' }
    },
      lines.map((ln, i) => 
        React.createElement('tspan', { key: i, x: paddingLeft, dy: i === 0 ? 0 : '1.2em' }, ln)
      )
    )
  );
}

function PassiveTooltip({ selected, hovered, tooltipTop, containerRef }) {
  const name = selected || (hovered && hovered.name);
  if (!name) return null;

  const evo = window.passivesData.evolvedPassives.find(e => e.name === name);
  const b = window.passivesData.basePassives.find(bi => bi.name === name);
  
  return React.createElement(
    'div',
    { 
      ref: containerRef, 
      style: { position: 'absolute', left: 8, top: tooltipTop, zIndex: 10, background: 'rgba(15,23,42,0.75)' }, 
      className: "backdrop-blur-sm rounded-lg p-4 max-w-md" 
    },
    React.createElement('div', { className: "text-white mb-2" },
      React.createElement('div', { className: "font-semibold" }, name),
      React.createElement('div', { className: "font-normal text-slate-200 mt-1" },
        evo ? evo.description || '' : b ? b.description || '' : ''
      )
    ),
    b && b.requirement && b.requirement !== 'N/A' && React.createElement(
      'div',
      { className: "text-amber-300 text-sm mb-2 border-l-2 border-amber-300 pl-2" },
      React.createElement('strong', null, "Requirement:"),
      " ",
      b.requirement
    ),
    evo && React.createElement(
      'div',
      { className: "text-slate-300 text-sm" },
      React.createElement('div', null, "Ingredients: ", (evo.ingredients || []).join(' + '))
    )
  );
}

function BuildingList({ 
  buildingsByCategory, 
  filteredCategories, 
  selectedBuilding, 
  onSelect, 
  searchTerm, 
  setSearchTerm,
  allItems
}) {
  return React.createElement(
    'div',
    { className: "flex flex-col bg-slate-800 border-r border-slate-700 flex-shrink-0", style: { width: 300 } },
    // Search Bar
    React.createElement(
      'div',
      { className: "p-4 border-b border-slate-700" },
      React.createElement('input', {
        type: "text",
        placeholder: "Search buildings & tiles...",
        value: searchTerm,
        onChange: (e) => setSearchTerm(e.target.value),
        className: "w-full px-3 py-2 bg-slate-700 text-white rounded border border-slate-600 focus:outline-none focus:border-blue-500 placeholder-slate-400"
      }),
      // Category Badge Buttons
      React.createElement(
        'div',
        { className: "mt-3" },
        React.createElement(
          'div',
          { className: "flex flex-wrap gap-2" },
          Object.keys(buildingsByCategory).map(category => 
            React.createElement(
              'button',
              {
                key: category,
                onClick: () => {
                  setSearchTerm(category);
                  onSelect(null);
                },
                className: `px-3 py-1 rounded-full text-xs font-semibold ${window.helpers.getCategoryColor(category)} cursor-pointer hover:opacity-80 transition-opacity`
              },
              category
            )
          )
        )
      ),
      React.createElement(
        'div',
        { className: "text-xs text-slate-400 mt-2" },
        "Showing ",
        Object.values(filteredCategories).reduce((acc, val) => acc + val.length, 0),
        " of ",
        allItems.length,
        " items"
      )
    ),

    // Building List
    React.createElement(
      'div',
      { className: "flex-1 overflow-y-auto" },
      Object.keys(filteredCategories).length === 0 ? 
        React.createElement(
          'div',
          { className: "p-4 text-slate-400 text-center" },
          "No items found"
        ) :
        React.createElement(
          'div',
          { className: "space-y-2 p-2" },
          Object.entries(filteredCategories).map(([category, items]) => 
            React.createElement(
              'div',
              { key: category },
              items.map((item) => 
                React.createElement(
                  'div',
                  {
                    key: item.name,
                    onClick: () => onSelect(item.name),
                    className: `p-3 cursor-pointer transition-colors rounded-md mb-2 ${selectedBuilding === item.name
                      ? 'bg-blue-900 bg-opacity-50 border-l-4 border-blue-500'
                      : 'bg-slate-800 hover:bg-slate-700 border-l-4 border-transparent'
                      }`
                  },
                  React.createElement(
                    'div',
                    { className: "flex items-start justify-between" },
                    React.createElement(
                      'div',
                      null,
                      React.createElement('div', { className: "font-bold text-white text-sm" }, item.name),
                      React.createElement('div', { className: "text-xs text-slate-300 line-clamp-2" }, item.description)
                    ),
                    React.createElement(
                      'span',
                      { className: `px-2 py-1 rounded-full text-xs font-semibold ${window.helpers.getCategoryColor(item.category)}` },
                      item.category
                    )
                  )
                )
              )
            )
          )
        )
    )
  );
}

function BuildingGrid({ 
  placedBuildings, 
  previewPosition, 
  onPlace, 
  onRemove, 
  error,
  handleDragOver,
  handleDragLeave,
  handleDrop,
  getOccupiedPositions,
  draggedBuilding,
  wasDraggedFromGrid,
  draggedInstanceId
}) {
  return React.createElement(
    'div',
    { className: "bg-slate-800 rounded-lg p-2 border-2 border-dashed border-slate-600 flex-1 flex flex-col min-h-0" },
    // Placement Error Message
    error && React.createElement(
      'div',
      { className: "bg-red-500 text-white text-center p-2 rounded-md mb-2" },
      error
    ),
    
    // Building Placement Grid
    React.createElement(
      'div',
      {
        className: "bg-slate-800 rounded-lg p-2 border-2 border-dashed border-slate-600 flex-1 flex flex-col min-h-0",
        onDragOver: handleDragOver,
        onDragLeave: handleDragLeave,
        onDrop: handleDrop
      },
      React.createElement(
        'div',
        {
          id: "buildingGrid",
          className: "grid grid-cols-40 grid-rows-30 gap-0 bg-slate-800 rounded flex-1 overflow-auto relative",
          style: {
            maxHeight: '100%',
            width: '100%',
            display: 'grid',
            gridTemplateRows: 'repeat(30, 30px)',
            gridTemplateColumns: 'repeat(40, 30px)'
          }
        },
        // Chunk borders - 8x6 blocks
        React.createElement(
          'div',
          {
            className: "absolute inset-0 pointer-events-none",
            style: {
              width: '1200px',
              height: '900px',
            }
          },
          // Draw vertical chunk borders every 8 cells (240px)
          [1, 2, 3, 4].map(i => 
            React.createElement(
              'div',
              {
                key: `v-chunk-${i}`,
                className: "absolute bg-yellow-500/40",
                style: {
                  left: `${i * 8 * 30}px`,
                  top: 0,
                  width: '2px',
                  height: '100%'
                }
              }
            )
          ),
          // Draw horizontal chunk borders every 6 cells (180px)
          [1, 2, 3, 4].map(i => 
            React.createElement(
              'div',
              {
                key: `h-chunk-${i}`,
                className: "absolute bg-yellow-500/40",
                style: {
                  left: 0,
                  top: `${i * 6 * 30}px`,
                  width: '100%',
                  height: '2px'
                }
              }
            )
          )
        ),

        // Grid background - empty cells
        React.createElement(
          'div',
          {
            className: "absolute inset-0 grid grid-cols-40 grid-rows-30",
            style: {
              width: '1200px', // 40 * 30
              height: '900px', // 30 * 30
              gridTemplateRows: 'repeat(30, 30px)',
              gridTemplateColumns: 'repeat(40, 30px)'
            }
          },
          Array.from({ length: 30 * 40 }).map((_, index) => {
            const row = Math.floor(index / 40);
            const col = index % 40;

            const isOccupied = false; // This would come from state
            let isPreview = false;
            if (previewPosition && draggedBuilding) {
              const { w, h } = draggedBuilding.size || { w: 2, h: 2 };
              const previewPositions = getOccupiedPositions(previewPosition.row, previewPosition.col, w, h);
              isPreview = previewPositions.includes(index);
            }

            if (isOccupied || isPreview) {
              return React.createElement('div', { key: `bg-${index}` });
            }

            return React.createElement(
              'div',
              {
                key: `bg-${index}`,
                className: "border border-slate-700 bg-slate-900/30"
              }
            );
          })
        ),

        // Preview overlay for dragged building
        previewPosition && draggedBuilding && React.createElement(
          'div',
          {
            className: "absolute bg-blue-500/50 border-2 border-dashed border-blue-400",
            style: {
              gridColumn: `${previewPosition.col + 1} / span ${draggedBuilding.size?.w ?? 2}`,
              gridRow: `${previewPosition.row + 1} / span ${draggedBuilding.size?.h ?? 2}`,
            }
          }
        ),

        // Render placed buildings as 2x2 blocks
        placedBuildings.map((placedBuilding) => {
          const { instanceId, building, row, col } = placedBuilding;
          const width = building.size?.w ?? 2;
          const height = building.size?.h ?? 2;

          return React.createElement(
            'div',
            {
              key: `building-${instanceId}`,
              className: "absolute bg-blue-700 cursor-pointer",
              style: {
                gridColumn: `${col + 1} / span ${width}`,
                gridRow: `${row + 1} / span ${height}`,
                width: '100%',
                height: '100%'
              },
              onContextMenu: (e) => {
                e.preventDefault();
                onRemove(instanceId);
              }
            },
            React.createElement('img', {
              src: window.helpers.getBuildingIconUrl(building.name),
              alt: building.name,
              className: "w-full h-full",
              draggable: "true",
              onDragStart: (e) => {
                e.dataTransfer.setData('text/plain', building.name);
                e.dataTransfer.effectAllowed = 'move';
              },
              onError: (e) => {
                e.target.style.display = 'none';
              }
            })
          );
        })
      )
    )
  );
}

function BuildingTooltip({ selectedBuildingData, mousePosition }) {
  if (!selectedBuildingData) return null;

  const getTooltipPosition = () => {
    if (typeof window === 'undefined') return { x: 0, y: 0 };

    const offsetX = 15;
    const offsetY = 15;
    const tooltipWidth = 320; // Approximate width of tooltip
    const tooltipHeight = 200; // Approximate height of tooltip

    let x = mousePosition.x + offsetX;
    let y = mousePosition.y + offsetY;

    // Prevent tooltip from going off-right of screen
    if (x + tooltipWidth > window.innerWidth) {
      x = mousePosition.x - tooltipWidth - 5;
    }

    // Prevent tooltip from going off-bottom of screen
    if (y + tooltipHeight > window.innerHeight) {
      y = mousePosition.y - tooltipHeight - 5;
    }

    // Prevent tooltip from going off-left of screen
    if (x < 0) {
      x = 5;
    }

    // Prevent tooltip from going off-top of screen
    if (y < 0) {
      y = 5;
    }

    return { x, y };
  };

  const tooltipPos = getTooltipPosition();

  return React.createElement(
    'div',
    {
      id: "tooltip-overlay",
      className: "fixed z-50 pointer-events-none",
      style: {
        left: tooltipPos.x + 'px',
        top: tooltipPos.y + 'px',
        maxWidth: '30rem'
      }
    },
    React.createElement(
      'div',
      { className: "bg-slate-900/90 backdrop-blur-sm rounded-lg p-4 border border-slate-700 shadow-xl" },
      // Building Icon and Name
      React.createElement(
        'div',
        { className: "flex items-start space-x-4" },
        React.createElement(
          'div',
          { className: "flex-shrink-0" },
          React.createElement('img', {
            src: window.helpers.getBuildingIconUrl(selectedBuildingData.name),
            alt: selectedBuildingData.name,
            className: "w-16 h-16 rounded object-cover border border-slate-600",
            onError: (e) => {
              e.target.src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="64" height="64"%3E%3Crect fill="%23475569" width="64" height="64"/%3E%3C/svg%3E';
            }
          })
        ),
        React.createElement(
          'div',
          { className: "flex-1" },
          React.createElement('h2', { className: "text-xl font-bold text-white mb-1" }, selectedBuildingData.name),
          React.createElement('p', { className: "text-slate-300 text-sm mb-2" }, selectedBuildingData.description),
          React.createElement(
            'div',
            { className: "flex flex-wrap gap-2" },
            React.createElement(
              'span',
              { className: `px-3 py-1 rounded-full text-xs font-semibold ${window.helpers.getCategoryColor(selectedBuildingData.category)}` },
              selectedBuildingData.category
            ),
            selectedBuildingData.cost.gold > 0 && React.createElement(
              'span',
              { className: "px-2 py-1 rounded-full text-xs font-semibold bg-yellow-500/20 text-yellow-300" },
              selectedBuildingData.cost.gold,
              " gold"
            ),
            selectedBuildingData.cost.wheat > 0 && React.createElement(
              'span',
              { className: "px-2 py-1 rounded-full text-xs font-semibold bg-amber-600/20 text-amber-200" },
              selectedBuildingData.cost.wheat,
              " wheat"
            ),
            selectedBuildingData.cost.wood > 0 && React.createElement(
              'span',
              { className: "px-2 py-1 rounded-full text-xs font-semibold bg-amber-800/20 text-amber-200" },
              selectedBuildingData.cost.wood,
              " wood"
            ),
            selectedBuildingData.cost.stone > 0 && React.createElement(
              'span',
              { className: "px-2 py-1 rounded-full text-xs font-semibold bg-gray-500/20 text-gray-300" },
              selectedBuildingData.cost.stone,
              " stone"
            )
          )
        )
      )
    )
  );
}

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
      allItems
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
    })
  );
}

function PassivesGraph() {
  const { passiveCategories, base, evolved, ingredientSet, noUpgrade, hasUpgrade, col1, col2, col3, col4, allNodeNames } = usePassives();
  const [selected, setSelected] = React.useState(null);
  const [hovered, setHovered] = React.useState(null);
  const [searchTerm, setSearchTerm] = React.useState('');
  const containerRef = React.useRef(null);
  const tooltipRef = React.useRef(null);
  const [tooltipTop, setTooltipTop] = React.useState(0);

  const categoryOrder = [
    'effigy', 'baby balls', 'healing', 'crit', 'damage',
    'defense', 'pierce', 'movement', 'on-hit', 'special', 'utility'
  ];

  const searchResults = React.useMemo(() => {
    if (!searchTerm) return [];
    return allNodeNames.filter(n => n.toLowerCase().includes(searchTerm.toLowerCase())).slice(0, 10);
  }, [searchTerm, allNodeNames]);

  // layout positions for 4 columns
  const positions = React.useMemo(() => {
    const map = {};
    const paddingTop = 40;
    const rowSpacing = 72;
    const colXs = [20, 220, 420, 620];
    const nodeW = 170; const nodeH = 56;

    // place evolved passives (col4) first so we can compute target positions
    // move them further down and increase their vertical spacing so connectors have shallower angles
    const col4Offset = 60;
    const col4RowSpacing = rowSpacing + 50;
    col4.forEach((item, idx) => {
      map[item.name] = { x: colXs[3], y: paddingTop + col4Offset + idx * col4RowSpacing, width: nodeW, height: nodeH };
    });

    // place leftmost columns (no-upgrade) using simple stacking
    col1.forEach((item, idx) => {
      map[item.name] = { x: colXs[0], y: paddingTop + idx * rowSpacing, width: nodeW, height: nodeH };
    });
    col2.forEach((item, idx) => {
      map[item.name] = { x: colXs[1], y: paddingTop + idx * rowSpacing, width: nodeW, height: nodeH };
    });

    // For column 3 (has upgrades), compute desired y as the average center-y of evolved passives that reference it
    // but clamp to not go below a minimum Y to keep col3 independent from col4's extra offset
    const col3MinY = paddingTop + col4Offset * 0.3; // only partially affected by col4 offset
    const desired = col3.map(p => {
      const usedBy = col4.filter(e => (e.ingredients || []).includes(p.name));
      if (usedBy.length === 0) return { name: p.name, desiredY: col3MinY };
      const avg = usedBy.reduce((sum, e) => {
        const pos = map[e.name];
        return sum + (pos.y + pos.height / 2);
      }, 0) / usedBy.length;
      // clamp so col3 doesn't move as much as col4
      return { name: p.name, desiredY: Math.max(col3MinY, avg - col4Offset * 0.7) };
    });

    // sort by desiredY so nodes sit near their targets, then assign positions with spacing to avoid overlaps
    desired.sort((a, b) => a.desiredY - b.desiredY);
    let currentY = col3MinY;
    desired.forEach(d => {
      const y = Math.max(currentY, d.desiredY - nodeH / 2);
      map[d.name] = { x: colXs[2], y: y, width: nodeW, height: nodeH };
      currentY = y + rowSpacing;
    });

    return map;
  }, [col1, col2, col3, col4]);

  const svgWidth = 1200;
  const svgHeight = React.useMemo(() => {
    const ys = Object.values(positions).map(p => p.y + p.height);
    return Math.max(600, (ys.length ? Math.max(...ys) + 80 : 600));
  }, [positions]);

  const getAncestors = (name) => {
    const ancestors = new Set();
    const toProcess = [name];
    const processed = new Set();
    while (toProcess.length) {
      const cur = toProcess.pop();
      if (processed.has(cur)) continue;
      processed.add(cur);
      evolved.forEach(e => {
        if (e.name === cur) {
          (e.ingredients || []).forEach(ing => { ancestors.add(ing); toProcess.push(ing); });
        }
      });
    }
    return ancestors;
  };

  const getDescendants = (name) => {
    const descendants = new Set();
    const toProcess = [name];
    const processed = new Set();
    while (toProcess.length) {
      const cur = toProcess.pop();
      if (processed.has(cur)) continue;
      processed.add(cur);
      evolved.forEach(e => {
        if ((e.ingredients || []).includes(cur)) {
          descendants.add(e.name);
          toProcess.push(e.name);
        }
      });
    }
    return descendants;
  };

  const highlightedChain = React.useMemo(() => {
    if (!selected) return new Set();
    const a = getAncestors(selected);
    const d = getDescendants(selected);
    return new Set([selected, ...a, ...d]);
  }, [selected]);

  // hover handlers (tooltip will be shown in fixed bottom-left panel)
  const onNodeHover = (e, node) => {
    setHovered(node);
  };
  const onNodeLeave = () => { setHovered(null); };

  // update tooltip position so it sits at the bottom-left of the visible scroll area
  React.useEffect(() => {
    const update = () => {
      const c = containerRef.current;
      const t = tooltipRef.current;
      if (!c || !t) return;
      const scrollTop = c.scrollTop;
      const clientH = c.clientHeight;
      const tipH = t.offsetHeight || 80;
      const top = scrollTop + clientH - tipH - 8; // 8px margin from bottom
      setTooltipTop(top);
    };
    update();
    const c = containerRef.current;
    if (c) c.addEventListener('scroll', update);
    window.addEventListener('resize', update);
    const mo = new MutationObserver(update);
    if (c) mo.observe(c, { childList: true, subtree: true, attributes: true });
    return () => { if (c) c.removeEventListener('scroll', update); window.removeEventListener('resize', update); if (mo) mo.disconnect(); };
  }, [containerRef, hovered, selected]);

  // build connector lines from ingredients to evolved nodes (include src/tgt names)
  const connectors = React.useMemo(() => {
    const out = [];
    col4.forEach(e => {
      const target = positions[e.name];
      if (!target) return;
      (e.ingredients || []).forEach(ing => {
        const src = positions[ing];
        if (!src) return;
        out.push({ src: ing, tgt: e.name, x1: src.x + src.width, y1: src.y + src.height / 2, x2: target.x, y2: target.y + target.height / 2 });
      });
    });
    return out;
  }, [col4, positions]);

  return React.createElement(
    'div',
    { className: "p-4" },
    React.createElement(
      'div',
      { className: "relative mb-3" },
      React.createElement('input', {
        type: "text",
        placeholder: "Search passives...",
        value: searchTerm,
        onChange: (e) => setSearchTerm(e.target.value),
        className: "w-full bg-slate-700 text-white placeholder-slate-400 rounded-md py-2 px-4"
      }),
      searchResults.length > 0 && React.createElement(
        'div',
        { className: "absolute z-10 w-full mt-1 bg-slate-800 border border-slate-700 rounded-md shadow-lg max-h-60 overflow-y-auto" },
        searchResults.map(name => 
          React.createElement(
            'div',
            {
              key: name,
              onClick: () => { setSelected(name); setSearchTerm(''); },
              className: "px-4 py-2 text-white hover:bg-slate-700 cursor-pointer"
            },
            name
          )
        )
      )
    ),

    React.createElement(
      'div',
      { ref: containerRef, className: "bg-slate-700 rounded-lg overflow-auto relative", style: { maxHeight: '72vh' } },
      React.createElement(
        'svg',
        { width: svgWidth, height: svgHeight, viewBox: `0 0 ${svgWidth} ${svgHeight}`, className: "block" },
        React.createElement(
          'defs',
          null,
          React.createElement(
            'marker',
            { id: "arrow", markerWidth: "10", markerHeight: "10", refX: "8", refY: "5", orient: "auto" },
            React.createElement('path', { d: "M0,0 L10,5 L0,10 z", fill: "#94a3b8" })
          )
        ),

        // connectors (show full opacity only when source or target is selected)
        connectors.map((c, i) => {
          const full = selected === c.src || selected === c.tgt;
          const opacity = full ? 0.9 : 0.12;
          return React.createElement(
            'line',
            {
              key: i,
              x1: c.x1,
              y1: c.y1,
              x2: c.x2,
              y2: c.y2,
              stroke: "#94a3b8",
              strokeWidth: full ? 1.8 : 1,
              markerEnd: "url(#arrow)",
              strokeOpacity: opacity
            }
          );
        }),

        // render nodes
        col1.map(p => 
          React.createElement(PassiveNode, {
            key: p.name,
            name: p.name,
            position: positions[p.name],
            isEvolved: false,
            highlightedChain,
            passiveCategories,
            onNodeHover,
            onNodeLeave,
            setSelected,
            selected
          })
        ),
        col2.map(p => 
          React.createElement(PassiveNode, {
            key: p.name,
            name: p.name,
            position: positions[p.name],
            isEvolved: false,
            highlightedChain,
            passiveCategories,
            onNodeHover,
            onNodeLeave,
            setSelected,
            selected
          })
        ),
        col3.map(p => 
          React.createElement(PassiveNode, {
            key: p.name,
            name: p.name,
            position: positions[p.name],
            isEvolved: false,
            highlightedChain,
            passiveCategories,
            onNodeHover,
            onNodeLeave,
            setSelected,
            selected
          })
        ),
        col4.map(e => 
          React.createElement(PassiveNode, {
            key: e.name,
            name: e.name,
            position: positions[e.name],
            isEvolved: true,
            highlightedChain,
            passiveCategories,
            onNodeHover,
            onNodeLeave,
            setSelected,
            selected
          })
        )
      ),

      // bottom-left tooltip panel (fixed inside graph container)
      (selected || hovered) && React.createElement(PassiveTooltip, {
        selected,
        hovered,
        tooltipTop,
        containerRef
      })
    )
  );
}

function BallEvolutionGraph() {
  const [selectedBall, setSelectedBall] = React.useState(null);
  const [hoveredNode, setHoveredNode] = React.useState(null);
  const [searchTerm, setSearchTerm] = React.useState('');

  const { 
    evolutions, 
    baseElements, 
    nameMap, 
    uniqueEvos, 
    recipesByEvo, 
    altNodes, 
    baseInfoMap,
    getAncestors,
    getDescendants
  } = useBallEvolution();

  const baseWidth = 140;
  const baseHeight = 45;
  const rowSpacing = 80;
  const evoSpacing = 60;

  const { positions, svgWidth, svgHeight, levels, columnAreas, columnHeaders } = React.useMemo(() => {
    if (!uniqueEvos || !baseElements) return { positions: {}, svgWidth: 1400, svgHeight: 900, levels: {}, columnAreas: {}, columnHeaders: [] };

    const levels = {};
    let maxLevel = 0;
    baseElements.forEach(b => levels[b] = 0);

    let changed = true;
    while (changed) {
      changed = false;
      uniqueEvos.forEach(evo => {
        if (levels[evo.name] !== undefined) return;
        const ingredientLevels = evo.ingredients.map(ing => levels[ing]);
        if (ingredientLevels.some(l => l === undefined)) return;
        const maxIngredientLevel = Math.max(...ingredientLevels);
        levels[evo.name] = maxIngredientLevel + 1;
        if (levels[evo.name] > maxLevel) maxLevel = levels[evo.name];
        changed = true;
      });
    }

    uniqueEvos.forEach(evo => {
      if (levels[evo.name] === undefined) {
        levels[evo.name] = maxLevel + 1;
      }
    });

    const positions = {};
    const columnWidth = baseWidth + 100;

    baseElements.forEach((element, idx) => {
      positions[element] = { x: 40, y: 50 + idx * rowSpacing };
    });

    let totalHeight = 50 + baseElements.length * rowSpacing;

    const numSubColumns = 2;
    const subColumnWidth = baseWidth + 80;
    const level1StartX = 40 + columnWidth;
    const subColumnYOffsets = new Array(numSubColumns).fill(50);

    if (maxLevel >= 1) {
      const level1Nodes = uniqueEvos.filter(evo => levels[evo.name] === 1);
      const level1Groups = {};
      level1Nodes.forEach(node => {
        const category = uniqueEvos.find(e => e.name === node.name)?.category.toUpperCase() || '';
        if (!level1Groups[category]) {
          level1Groups[category] = [];
        }
        level1Groups[category].push(node);
      });

      baseElements.forEach((baseElement, index) => {
        const group = level1Groups[baseElement];
        if (!group || group.length === 0) return;

        const subColIndex = index % numSubColumns;
        const groupX = level1StartX + subColIndex * subColumnWidth;

        const baseElementY = positions[baseElement].y;
        let groupY = Math.max(baseElementY, subColumnYOffsets[subColIndex]);

        group.forEach((node, nodeIndex) => {
          const y = groupY + nodeIndex * evoSpacing;
          positions[node.name] = { x: groupX, y: y };
        });

        subColumnYOffsets[subColIndex] = groupY + group.length * evoSpacing + rowSpacing / 2;
      });

      totalHeight = Math.max(totalHeight, ...subColumnYOffsets);
    }

    const level2PlusStartX = level1StartX + (maxLevel > 0 ? numSubColumns * subColumnWidth : 0);
    for (let level = 2; level <= maxLevel + 1; level++) {
      const nodesInLevel = Object.keys(levels).filter(name => levels[name] === level);
      const nodesWithTargetY = nodesInLevel.map(name => {
        const evo = uniqueEvos.find(e => e.name === name) || { ingredients: [] };
        const ingredientPositions = evo.ingredients.map(ing => positions[ing]).filter(p => p);
        let targetY = 0;
        if (ingredientPositions.length > 0) {
          targetY = ingredientPositions.reduce((sum, p) => sum + p.y, 0) / ingredientPositions.length;
        }
        return { name, targetY };
      });

      nodesWithTargetY.sort((a, b) => a.targetY - b.targetY);

      let lastYInColumn = 0;
      nodesWithTargetY.forEach(({ name, targetY }) => {
        const x = level2PlusStartX + (level - 2) * columnWidth;
        const y = Math.max(targetY, lastYInColumn + evoSpacing);
        positions[name] = { x, y };
        lastYInColumn = y;
      });
      if (lastYInColumn > totalHeight) totalHeight = lastYInColumn;
    }

    const newSvgWidth = level2PlusStartX + (maxLevel > 1 ? (maxLevel - 1) * columnWidth : 0) + baseWidth + 40;

    const columnAreas = {
      base: { x: 0, width: columnWidth + 20 },
      evolved: { x: columnWidth + 20, width: numSubColumns * subColumnWidth },
      ultimate: { x: columnWidth + 20 + numSubColumns * subColumnWidth, width: newSvgWidth - (columnWidth + 20 + numSubColumns * subColumnWidth) }
    };

    const columnHeaders = [
      { text: 'Base Balls', x: columnAreas.base.x + columnAreas.base.width / 2, y: 30, id: 'base' },
      { text: 'Evolved Balls', x: columnAreas.evolved.x + columnAreas.evolved.width / 2, y: 30, id: 'evolved' },
      { text: 'Ultimate Balls', x: columnAreas.ultimate.x + columnAreas.ultimate.width / 2, y: 30, id: 'ultimate' }
    ];

    return { positions, svgWidth: newSvgWidth, svgHeight: totalHeight + baseHeight, levels, columnAreas, columnHeaders };
  }, [uniqueEvos, baseElements]);

  const highlightedChain = React.useMemo(() => {
    if (!selectedBall || !evolutions) return new Set();
    const ancestors = getAncestors(selectedBall, evolutions);
    const descendants = getDescendants(selectedBall, evolutions);
    const chain = new Set([...ancestors, ...descendants, selectedBall]);
    return chain;
  }, [selectedBall, evolutions, getAncestors, getDescendants]);

  const allNodeNames = React.useMemo(() => {
    if (!baseElements || !evolutions) return [];
    const evoNames = new Set(evolutions.map(e => e.name));
    const allNames = new Set([...baseElements, ...evoNames]);
    return Array.from(allNames).sort();
  }, [evolutions, baseElements]);

  const searchResults = React.useMemo(() => {
    if (!searchTerm || !allNodeNames) return [];
    return allNodeNames
      .filter(name => (nameMap[name] || name).toLowerCase().includes(searchTerm.toLowerCase()))
      .slice(0, 10);
  }, [searchTerm, allNodeNames, nameMap]);


  const activeNode = selectedBall || hoveredNode;
  const recipesForActiveNode = React.useMemo(() => {
    if (!activeNode || !evolutions) return [];

    // If the active node is an evolution, show its recipes (ingredients combinations)
    const evoRecipes = evolutions
      .filter(evo => evo.name === activeNode)
      .map(evo => {
        const sortedIngredients = evo.ingredients
          .map(ing => nameMap[ing] || ing)
          .sort();
        return sortedIngredients.join(' + ');
      });

    if (evoRecipes.length > 0) {
      return [...new Set(evoRecipes)];
    }

    // Do not list evolutions for base balls — the graph conveys upgrades.
    return [];
  }, [activeNode, evolutions, nameMap]);

  const descriptionForActiveNode = React.useMemo(() => {
    if (!activeNode) return '';
    // if it's an evolution, return evo description
    if (evolutions) {
      const evo = evolutions.find(e => e.name === activeNode);
      if (evo && evo.description) return evo.description;
    }
    // otherwise check base info map for description only
    if (typeof baseInfoMap !== 'undefined' && baseInfoMap[activeNode]) {
      const b = baseInfoMap[activeNode];
      return b.description || '';
    }
    return '';
  }, [activeNode, evolutions, baseInfoMap]);

  const startCharacterForActiveNode = React.useMemo(() => {
    if (!activeNode) return '';
    if (typeof baseInfoMap !== 'undefined' && baseInfoMap[activeNode]) {
      return baseInfoMap[activeNode].startCharacter || '';
    }
    return '';
  }, [activeNode, baseInfoMap]);

  return React.createElement(
    'div',
    { className: "relative", style: { display: 'block' } },
    React.createElement(
      'div',
      { className: "bg-slate-800 rounded-lg overflow-y-auto overflow-x-auto", style: { maxHeight: '84vh' } },
      React.createElement(
        'svg',
        {
          width: svgWidth,
          height: svgHeight,
          viewBox: `0 0 ${svgWidth} ${svgHeight}`,
          className: "bg-slate-700",
          style: { minHeight: '900px', display: 'block' }
        },
        React.createElement(
          'defs',
          null,
          React.createElement(
            'marker',
            { id: "arrowhead", markerWidth: "10", markerHeight: "10", refX: "8", refY: "3", orient: "auto" },
            React.createElement('polygon', { points: "0 0, 10 3, 0 6", fill: "#94a3b8" })
          ),
          React.createElement(
            'marker',
            { id: "arrowhead-gold", markerWidth: "10", markerHeight: "10", refX: "8", refY: "3", orient: "auto" },
            React.createElement('polygon', { points: "0 0, 10 3, 0 6", fill: "#f59e0b" })
          ),
          // Background Gradients
          React.createElement(
            'linearGradient',
            { id: "base-gradient", x1: "0%", y1: "0%", x2: "0%", y2: "100%" },
            React.createElement('stop', { offset: "0%", style: { stopColor: 'rgba(156, 163, 175, 0.15)' } }),
            React.createElement('stop', { offset: "100%", style: { stopColor: 'rgba(156, 163, 175, 0)' } })
          ),
          React.createElement(
            'linearGradient',
            { id: "evolved-gradient", x1: "0%", y1: "0%", x2: "0%", y2: "100%" },
            React.createElement('stop', { offset: "0%", style: { stopColor: 'rgba(59, 130, 246, 0.08)' } }),
            React.createElement('stop', { offset: "100%", style: { stopColor: 'rgba(59, 130, 246, 0)' } })
          ),
          React.createElement(
            'linearGradient',
            { id: "ultimate-gradient", x1: "0%", y1: "0%", x2: "0%", y2: "100%" },
            React.createElement('stop', { offset: "0%", style: { stopColor: 'rgba(252, 211, 77, 0.1)' } }),
            React.createElement('stop', { offset: "100%", style: { stopColor: 'rgba(252, 211, 77, 0)' } })
          ),
          // Text Gradients
          React.createElement(
            'linearGradient',
            { id: "base-text-gradient", x1: "0%", y1: "0%", x2: "0%", y2: "100%" },
            React.createElement('stop', { offset: "0%", stopColor: "#e2e8f0" }),
            React.createElement('stop', { offset: "100%", stopColor: "#94a3b8" })
          ),
          React.createElement(
            'linearGradient',
            { id: "evolved-text-gradient", x1: "0%", y1: "0%", x2: "0%", y2: "100%" },
            React.createElement('stop', { offset: "0%", stopColor: "#93c5fd" }),
            React.createElement('stop', { offset: "100%", stopColor: "#3b82f6" })
          ),
          React.createElement(
            'linearGradient',
            { id: "ultimate-text-gradient", x1: "0%", y1: "0%", x2: "0%", y2: "100%" },
            React.createElement('stop', { offset: "0%", stopColor: "#fde047" }),
            React.createElement('stop', { offset: "100%", stopColor: "#f59e0b" })
          )
        ),

        // Backgrounds
        columnAreas.base && React.createElement('rect', { x: columnAreas.base.x, y: "0", width: columnAreas.base.width, height: "100%", fill: "url(#base-gradient)" }),
        columnAreas.evolved && React.createElement('rect', { x: columnAreas.evolved.x, y: "0", width: columnAreas.evolved.width, height: "100%", fill: "url(#evolved-gradient)" }),
        columnAreas.ultimate && React.createElement('rect', { x: columnAreas.ultimate.x, y: "0", width: columnAreas.ultimate.width, height: "100%", fill: "url(#ultimate-gradient)" }),

        // Headers
        columnHeaders.map(header => 
          React.createElement(
            'text',
            {
              key: header.id,
              x: header.x,
              y: header.y,
              textAnchor: "middle",
              fontSize: "20",
              fontWeight: "bold",
              fill: `url(#${header.id}-text-gradient)`,
              style: { textShadow: '1px 1px 2px rgba(0,0,0,0.5)' }
            },
            header.text
          )
        ),

        // Lines
        Object.entries(recipesByEvo).map(([evoName, recipes]) => {
          const endPos = positions[evoName];
          if (!endPos) return null;
          const numRecipes = recipes.length;

          return recipes.map((recipe, recipeIndex) => {
            const yOffset = (baseHeight / (numRecipes + 1)) * (recipeIndex + 1);
            const lineStyle = recipeIndex === 0 ? "none" : recipeIndex === 1 ? "4 4" : "1 5";

            return recipe.map((ing, ingIdx) => {
              const startPos = positions[ing];
              if (!startPos) return null;

              const isHighlighted = highlightedChain.has(evoName) && highlightedChain.has(ing);
              const isAlt = recipeIndex > 0;
              // Keep alternative (non-primary) recipes gold even when highlighted;
              // highlight should affect width/opacity but not change alt color.
              const strokeColor = isAlt ? '#f59e0b' : (isHighlighted ? '#3b82f6' : '#64748b');
              const markerId = isAlt ? 'arrowhead-gold' : 'arrowhead';

              return React.createElement(
                'line',
                {
                  key: `line-${evoName}-${recipeIndex}-${ingIdx}`,
                  x1: startPos.x + baseWidth,
                  y1: startPos.y + baseHeight / 2,
                  x2: endPos.x,
                  y2: endPos.y + yOffset,
                  stroke: strokeColor,
                  strokeWidth: isHighlighted ? 2 : 1,
                  strokeDasharray: lineStyle,
                  markerEnd: `url(#${markerId})`,
                  opacity: !selectedBall ? 0.4 : (isHighlighted ? 1 : 0.3),
                  className: "transition-all"
                }
              );
            });
          });
        }),

        // Nodes
        baseElements.map((element) => 
          React.createElement(BallNode, {
            key: `base-${element}`,
            name: element,
            position: positions[element],
            isHighlighted: selectedBall === element,
            onClick: () => setSelectedBall(selectedBall === element ? null : element),
            nameMap,
            baseHeight
          })
        ),

        uniqueEvos.map((evo, idx) => {
          const pos = positions[evo.name];
          if (!pos) return null;

          const level = levels[evo.name];
          const isUltimate = level >= 2;
          const isSelected = selectedBall === evo.name;
          const isInChain = highlightedChain.has(evo.name);
          const isAltNode = altNodes && altNodes.has && altNodes.has(evo.name);

          return React.createElement(BallNode, {
            key: `evo-${evo.name}-${idx}`,
            name: evo.name,
            position: pos,
            isHighlighted: isSelected,
            onClick: () => setSelectedBall(selectedBall === evo.name ? null : evo.name),
            nameMap,
            baseHeight
          });
        })
      )
    ),

    activeNode && React.createElement(
      'div',
      { className: "absolute bottom-2 left-2 z-10 bg-slate-900/75 backdrop-blur-sm rounded-lg p-4 max-w-md" },
      React.createElement(
        'div',
        { className: "text-white mb-2" },
        React.createElement('div', { className: "font-semibold" }, (nameMap[activeNode] || activeNode)),
        descriptionForActiveNode && React.createElement('div', { className: "font-normal text-slate-200 mt-1" }, descriptionForActiveNode),
        startCharacterForActiveNode && React.createElement('div', { className: "text-slate-400 text-sm mt-2" }, startCharacterForActiveNode)
      ),
      recipesForActiveNode.length > 0 ? 
        React.createElement(
          'div',
          { className: "text-slate-300 text-sm" },
          recipesForActiveNode.map((r, i) => 
            React.createElement('div', { key: i }, r)
          )
        ) : null
    )
  );
}

function App() {
  const [tab, setTab] = React.useState(() => {
    const hash = window.location.hash.slice(1);
    return ['balls', 'passives', 'buildings'].includes(hash) ?
      (hash === 'balls' ? 'Evolutions' : hash === 'passives' ? 'Passives' : 'Buildings') :
      'Evolutions';
  });

  React.useEffect(() => {
    const handleHashChange = () => {
      const hash = window.location.hash.slice(1);
      if (hash === 'balls') setTab('Evolutions');
      else if (hash === 'passives') setTab('Passives');
      else if (hash === 'buildings') setTab('Buildings');
      else setTab('Evolutions');
    };
    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  const handleTabChange = (tabName, hash) => {
    setTab(tabName);
    window.location.hash = hash;
  };

  return React.createElement(
    'div',
    { className: "w-full h-full bg-gradient-to-br from-slate-900 to-slate-950 p-6 overflow-hidden" },
    React.createElement(
      'div',
      { className: "max-w-full h-full" },
      React.createElement(
        'div',
        { className: "flex items-center gap-3 mb-4" },
        React.createElement('h1', { className: "text-4xl font-bold text-white mb-0" }, "Ball x Pit"),
        React.createElement(
          'div',
          { className: "inline-flex rounded-md bg-slate-800/40 p-1" },
          React.createElement(
            'button',
            { 
              onClick: () => handleTabChange('Evolutions', 'balls'), 
              className: `px-3 py-1 rounded ${tab === 'Evolutions' ? 'bg-slate-700 text-white' : 'text-slate-300'}`
            },
            "Evolutions"
          ),
          React.createElement(
            'button',
            { 
              onClick: () => handleTabChange('Passives', 'passives'), 
              className: `ml-2 px-3 py-1 rounded ${tab === 'Passives' ? 'bg-slate-700 text-white' : 'text-slate-300'}`
            },
            "Passives"
          ),
          React.createElement(
            'button',
            { 
              onClick: () => handleTabChange('Buildings', 'buildings'), 
              className: `ml-2 px-3 py-1 rounded ${tab === 'Buildings' ? 'bg-slate-700 text-white' : 'text-slate-300'}`
            },
            "Buildings"
          )
        )
      ),

      React.createElement(
        'div',
        { className: "relative mb-4 max-w-md", style: { display: tab === 'Evolutions' ? 'block' : 'none' } },
        React.createElement('input', {
          type: "text",
          placeholder: "Search for a ball...",
          className: "w-full bg-slate-700 text-white placeholder-slate-400 rounded-md py-2 px-4 focus:outline-none focus:ring-2 focus:ring-blue-500"
        })
      ),

      tab === 'Evolutions' && React.createElement(BallEvolutionGraph),
      tab === 'Passives' && React.createElement(PassivesGraph),
      tab === 'Buildings' && React.createElement(BuildingsViewer),
      
      React.createElement(
        'footer',
        { className: "mt-6 text-slate-400 text-sm text-center" },
        "Rights to their respective owners: ",
        React.createElement(
          'a',
          { href: "https://store.steampowered.com/app/2062430/BALL_x_PIT/", target: "_blank", rel: "noopener noreferrer", className: "text-slate-200 underline" },
          "Ball X Pit"
        ),
        " / ",
        React.createElement(
          'a',
          { href: "https://www.devolverdigital.com/", target: "_blank", rel: "noopener noreferrer", className: "text-slate-200 underline" },
          "Devolver Digital"
        ),
        ". Data from: ",
        React.createElement(
          'a',
          { href: "https://ballpit.fandom.com/wiki/Ball_X_Pit_Wiki", target: "_blank", rel: "noopener noreferrer", className: "text-slate-200 underline" },
          "Ball X Pit Wiki"
        ),
        "."
      )
    )
  );
}