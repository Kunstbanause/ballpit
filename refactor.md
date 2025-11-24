# Refactoring Plan for Ball x Pit

## Current Problems
- Single 1500+ line file with all components
- Deep nesting (5-10 levels)
- Inline complex logic mixed with JSX
- Hard for AI to make focused changes without breaking syntax

## Proposed File Structure

```
/
├── index.html (minimal, just loads scripts)
├── data/
│   ├── balls.js
│   ├── passives.js
│   └── buildings.js
├── utils/
│   └── helpers.js
├── components/
│   ├── BallEvolution/
│   │   ├── BallEvolutionGraph.js (main component)
│   │   ├── BallNode.js (extracted node rendering)
│   │   ├── SearchBar.js
│   │   ├── NodeTooltip.js
│   │   └── useBallEvolution.js (custom hook for logic)
│   ├── Passives/
│   │   ├── PassivesGraph.js
│   │   ├── PassiveNode.js
│   │   ├── PassiveTooltip.js
│   │   └── usePassives.js
│   └── Buildings/
│       ├── BuildingsViewer.js
│       ├── BuildingList.js (left column)
│       ├── BuildingGrid.js (right column)
│       ├── BuildingTooltip.js
│       └── useBuildings.js
└── App.js (main app component)
```

## Key Refactoring Strategies

### 1. **Extract Custom Hooks**
Move complex state and computation logic out of components:

```javascript
// components/Buildings/useBuildings.js
function useBuildings() {
  const [placedBuildings, setPlacedBuildings] = useState([]);
  const [occupiedCells, setOccupiedCells] = useState(() => 
    Array(30 * 40).fill(false)
  );
  
  const placeBuilding = useCallback((row, col, building) => {
    // Logic here
  }, []);
  
  const removeBuilding = useCallback((instanceId) => {
    // Logic here
  }, []);
  
  return {
    placedBuildings,
    occupiedCells,
    placeBuilding,
    removeBuilding
  };
}
```

### 2. **Extract Presentational Components**
Separate UI from logic:

```javascript
// components/Buildings/BuildingList.js
function BuildingList({ 
  buildings, 
  selectedBuilding, 
  onSelect, 
  onDragStart 
}) {
  return (
    <div className="flex flex-col">
      {/* Simple, focused rendering */}
    </div>
  );
}
```

### 3. **Flatten Nested Conditionals**
Instead of:
```javascript
{activeNode && (() => {
  const data = findData(activeNode);
  if (data && data.requirement && data.requirement !== 'N/A') {
    return <div>...</div>;
  }
  return null;
})()}
```

Extract to:
```javascript
// components/Buildings/BuildingTooltip.js
function BuildingRequirement({ building }) {
  if (!building?.requirement || building.requirement === 'N/A') {
    return null;
  }
  
  return (
    <div className="text-amber-300 text-sm mb-2">
      <strong>Requirement:</strong> {building.requirement}
    </div>
  );
}
```

### 4. **Extract Calculation Logic**
```javascript
// utils/gridHelpers.js
export function getOccupiedPositions(topLeftRow, topLeftCol, width = 2, height = 2) {
  const positions = [];
  for (let r = 0; r < height; r++) {
    for (let c = 0; c < width; c++) {
      positions.push((topLeftRow + r) * 40 + (topLeftCol + c));
    }
  }
  return positions;
}

export function canPlaceBuilding(row, col, building, occupiedCells, placedBuildings) {
  // Pure function - easier to test and modify
}
```

### 5. **Simplify SVG Rendering**
Instead of inline SVG with complex calculations:

```javascript
// components/BallEvolution/BallNode.js
function BallNode({ name, position, isHighlighted, onClick }) {
  const displayName = useDisplayName(name);
  const iconUrl = useIconUrl(name);
  
  return (
    <g transform={`translate(${position.x}, ${position.y})`}>
      <rect 
        className={cn(
          "cursor-pointer transition-all",
          isHighlighted ? "opacity-100" : "opacity-30"
        )}
        onClick={onClick}
      />
      <BallIcon url={iconUrl} />
      <BallLabel text={displayName} />
    </g>
  );
}
```

## Implementation Steps

1. **Phase 1: Extract hooks** (minimal UI changes)
   - Create `useBuildings.js`, `useBallEvolution.js`, `usePassives.js`
   - Move all state and complex logic into hooks
   - Main components become thin wrappers

2. **Phase 2: Split components** (one component at a time)
   - Start with BuildingsViewer (most complex)
   - Extract BuildingList, BuildingGrid, BuildingTooltip
   - Test thoroughly after each extraction

3. **Phase 3: Extract utilities**
   - Move grid calculations to `gridHelpers.js`
   - Move graph calculations to `graphHelpers.js`
   - Pure functions are easier to test and modify

4. **Phase 4: Simplify JSX**
   - Remove inline arrow functions
   - Extract conditional rendering to separate components
   - Flatten nested ternaries

## Benefits

- **AI-friendly**: Smaller, focused files are easier to modify
- **Maintainable**: Clear separation of concerns
- **Testable**: Pure functions and isolated components
- **Debuggable**: Easier to trace issues
- **Reusable**: Components and hooks can be reused

## Example: BuildingsViewer Refactored

```javascript
// components/Buildings/BuildingsViewer.js (simplified)
function BuildingsViewer() {
  const {
    placedBuildings,
    placeBuilding,
    removeBuilding,
    dragState,
    previewPosition,
    error
  } = useBuildings();
  
  const {
    filteredCategories,
    selectedBuilding,
    setSelectedBuilding,
    searchTerm,
    setSearchTerm
  } = useBuildingSearch();
  
  return (
    <div className="flex h-[84vh]">
      <BuildingList
        categories={filteredCategories}
        selected={selectedBuilding}
        onSelect={setSelectedBuilding}
        searchTerm={searchTerm}
        onSearchChange={setSearchTerm}
      />
      
      <ResizeHandle />
      
      <BuildingGrid
        placedBuildings={placedBuildings}
        previewPosition={previewPosition}
        onPlace={placeBuilding}
        onRemove={removeBuilding}
        error={error}
      />
      
      {selectedBuilding && (
        <BuildingTooltip building={selectedBuilding} />
      )}
    </div>
  );
}
```

Much easier for AI to understand and modify!