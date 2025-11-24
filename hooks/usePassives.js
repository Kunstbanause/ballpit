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