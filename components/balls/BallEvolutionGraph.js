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
    { className: "p-4 relative" },
    React.createElement(
      'div',
      { className: "relative mb-3" },
      React.createElement('input', {
        type: "text",
        placeholder: "Search for a ball...",
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
              onClick: () => {
                setSelectedBall(name); // Select the ball when clicked
                setSearchTerm(''); // Clear the search term after selection
              },
              className: "px-4 py-2 text-white hover:bg-slate-700 cursor-pointer"
            },
            nameMap[name] || name
          )
        )
      )
    ),
    React.createElement(
      'div',
      { className: "bg-slate-800 rounded-lg overflow-y-auto overflow-x-auto", style: { maxHeight: '78vh' } },
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

              const isNodeInChain = selectedBall ? highlightedChain.has(ing) : true;
              const isEvoInChain = selectedBall ? highlightedChain.has(evoName) : true;
              const isHighlighted = highlightedChain.has(evoName) && highlightedChain.has(ing);

              // Determine line opacity based on connection to selected chain
              let lineOpacity;
              if (selectedBall) {
                if (isHighlighted) {
                  lineOpacity = 1; // Highlighted connections stay fully opaque
                } else {
                  lineOpacity = 0.1; // Unconnected lines become very transparent
                }
              } else {
                lineOpacity = 0.4; // Default opacity when no ball is selected
              }

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
                  opacity: lineOpacity,
                  className: "transition-all"
                }
              );
            });
          });
        }),

        // Nodes
        baseElements.map((element) => {
          const isHighlightedNode = selectedBall === element;
          const isInChain = selectedBall ? highlightedChain.has(element) : true;
          const opacity = selectedBall && !isInChain ? 0.2 : 1; // Fade unconnected nodes to low transparency

          return React.createElement(BallNode, {
            key: `base-${element}`,
            name: element,
            position: positions[element],
            isHighlighted: isHighlightedNode,
            searchTerm: searchTerm.toLowerCase(),
            onClick: () => setSelectedBall(selectedBall === element ? null : element),
            onHover: () => setHoveredNode(element),
            onLeave: () => setHoveredNode(null),
            nameMap,
            baseHeight,
            opacity: opacity
          });
        }),

        uniqueEvos.map((evo, idx) => {
          const pos = positions[evo.name];
          if (!pos) return null;

          const level = levels[evo.name];
          const isUltimate = level >= 2;
          const isSelected = selectedBall === evo.name;
          const isInChain = selectedBall ? highlightedChain.has(evo.name) : true;
          const isAltNode = altNodes && altNodes.has && altNodes.has(evo.name);
          const opacity = selectedBall && !isInChain ? 0.2 : 1; // Fade unconnected nodes to low transparency

          return React.createElement(BallNode, {
            key: `evo-${evo.name}-${idx}`,
            name: evo.name,
            position: pos,
            isHighlighted: isSelected,
            searchTerm: searchTerm.toLowerCase(),
            onClick: () => setSelectedBall(selectedBall === evo.name ? null : evo.name),
            onHover: () => setHoveredNode(evo.name),
            onLeave: () => setHoveredNode(null),
            nameMap,
            baseHeight,
            opacity: opacity
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