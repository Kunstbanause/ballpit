# Refactoring Prompt for AI

Copy and paste this prompt to your AI assistant:

---

I need help refactoring my React application into separate files for better maintainability. My current `App.js` is 2000+ lines and contains all components and hooks in a single file. I want to split it into a clean file structure where each component and hook is in its own file.

## Current Structure
- `index.html` - loads all scripts
- `App.js` - contains everything (hooks, components, main app)
- `data/` folder - contains balls.js, passives.js, buildings.js
- `utils/` folder - contains helpers.js

## Target File Structure

```
/
├── index.html
├── App.js (simplified - just tab navigation)
├── data/
│   ├── balls.js
│   ├── passives.js
│   └── buildings.js
├── utils/
│   ├── helpers.js
│   └── gridHelpers.js (NEW)
├── hooks/
│   ├── useBuildings.js (NEW)
│   ├── useBallEvolution.js (NEW)
│   └── usePassives.js (NEW)
└── components/
    ├── balls/
    │   ├── BallNode.js (NEW)
    │   └── BallEvolutionGraph.js (NEW)
    ├── passives/
    │   ├── PassiveNode.js (NEW)
    │   ├── PassiveTooltip.js (NEW)
    │   └── PassivesGraph.js (NEW)
    └── buildings/
        ├── BuildingList.js (NEW)
        ├── BuildingGrid.js (NEW)
        ├── BuildingTooltip.js (NEW)
        └── BuildingsViewer.js (NEW)
```

## Important Constraints

1. **No ES6 modules**: We're loading scripts directly via `<script>` tags, so all functions must be globally accessible
2. **Keep using React.createElement**: Don't convert to JSX
3. **Preserve all logic**: Don't change functionality, just reorganize files
4. **Load order matters**: Files must be loaded in dependency order in index.html

## Format for Each File

Since we're not using modules, each file should declare functions globally:

```javascript
// Example: hooks/useBuildings.js
function useBuildings() {
  // ... all hook logic ...
  
  return {
    placedBuildings,
    placeBuilding,
    removeBuilding,
    // ... etc
  };
}
```

```javascript
// Example: components/buildings/BuildingList.js
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
    // ... component JSX ...
  );
}
```

## What I Need You To Do

**Phase 1: Extract Utilities and Hooks**

1. Create `utils/gridHelpers.js` with the `getOccupiedPositions` function
2. Create `hooks/useBuildings.js` with the `useBuildings` hook
3. Create `hooks/useBallEvolution.js` with the `useBallEvolution` hook
4. Create `hooks/usePassives.js` with the `usePassives` hook

**Phase 2: Extract Small Components**

5. Create `components/balls/BallNode.js` with the `BallNode` component
6. Create `components/passives/PassiveNode.js` with the `PassiveNode` component
7. Create `components/passives/PassiveTooltip.js` with the `PassiveTooltip` component
8. Create `components/buildings/BuildingTooltip.js` with the `BuildingTooltip` component

**Phase 3: Extract List/Grid Components**

9. Create `components/buildings/BuildingList.js` with the `BuildingList` component
10. Create `components/buildings/BuildingGrid.js` with the `BuildingGrid` component

**Phase 4: Extract Main Graph Components**

11. Create `components/buildings/BuildingsViewer.js` with the `BuildingsViewer` component
12. Create `components/passives/PassivesGraph.js` with the `PassivesGraph` component
13. Create `components/balls/BallEvolutionGraph.js` with the `BallEvolutionGraph` component

**Phase 5: Simplify App.js and Update index.html**

14. Simplify `App.js` to only contain the main `App` component (tab navigation and routing)
15. Update `index.html` to load all new files in the correct order

## Start with Phase 1

Please start by creating the files for Phase 1. For each file:
1. Show me the complete file contents
2. Explain what dependencies it has (what it uses from other files)
3. Confirm it will work when loaded via `<script type="text/babel" src="...">` tag

After Phase 1 is complete and I confirm it works, we'll move to Phase 2, and so on.

Let's begin with creating `utils/gridHelpers.js` first.

---

## Additional Context (if needed)

If the AI asks for the current App.js content, provide it. If the AI seems confused about the architecture, remind it:
- "We're NOT using ES6 import/export"
- "All functions must be globally accessible"
- "We're loading files in order via script tags in index.html"
- "Keep using React.createElement, don't convert to JSX"