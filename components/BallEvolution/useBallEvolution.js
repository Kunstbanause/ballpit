import { useState, useMemo, useEffect } from 'react';

function useBallEvolution() {
  const { evolutions, baseElements, nameMap, uniqueEvos, recipesByEvo, altNodes, baseInfoMap } = useMemo(() => {
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

export default useBallEvolution;