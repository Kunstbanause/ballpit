import React, { useState, useMemo, useRef, useEffect } from 'react';
import usePassives from './usePassives';
import PassiveNode from './PassiveNode';
import PassiveTooltip from './PassiveTooltip';

function PassivesGraph() {
  const { passiveCategories, base, evolved, ingredientSet, noUpgrade, hasUpgrade, col1, col2, col3, col4, allNodeNames } = usePassives();
  const [selected, setSelected] = useState(null);
  const [hovered, setHovered] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const containerRef = useRef(null);
  const tooltipRef = useRef(null);
  const [tooltipTop, setTooltipTop] = useState(0);

  const categoryOrder = [
    'effigy', 'baby balls', 'healing', 'crit', 'damage',
    'defense', 'pierce', 'movement', 'on-hit', 'special', 'utility'
  ];

  const searchResults = useMemo(() => {
    if (!searchTerm) return [];
    return allNodeNames.filter(n => n.toLowerCase().includes(searchTerm.toLowerCase())).slice(0, 10);
  }, [searchTerm, allNodeNames]);

  // layout positions for 4 columns
  const positions = useMemo(() => {
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
  const svgHeight = useMemo(() => {
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

  const highlightedChain = useMemo(() => {
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
  useEffect(() => {
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
  const connectors = useMemo(() => {
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

  return (
    <div className="p-4">
      <div className="relative mb-3">
        <input
          type="text"
          placeholder="Search passives..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full bg-slate-700 text-white placeholder-slate-400 rounded-md py-2 px-4"
        />
        {searchResults.length > 0 && (
          <div className="absolute z-10 w-full mt-1 bg-slate-800 border border-slate-700 rounded-md shadow-lg max-h-60 overflow-y-auto">
            {searchResults.map(name => (
              <div key={name} onClick={() => { setSelected(name); setSearchTerm(''); }} className="px-4 py-2 text-white hover:bg-slate-700 cursor-pointer">
                {name}
              </div>
            ))}
          </div>
        )}
      </div>

      <div ref={containerRef} className="bg-slate-700 rounded-lg overflow-auto relative" style={{ maxHeight: '72vh' }}>
        <svg width={svgWidth} height={svgHeight} viewBox={`0 0 ${svgWidth} ${svgHeight}`} className="block">
          <defs>
            <marker id="arrow" markerWidth="10" markerHeight="10" refX="8" refY="5" orient="auto">
              <path d="M0,0 L10,5 L0,10 z" fill="#94a3b8" />
            </marker>
          </defs>

          {/* connectors (show full opacity only when source or target is selected) */}
          {connectors.map((c, i) => {
            const full = selected === c.src || selected === c.tgt;
            const opacity = full ? 0.9 : 0.12;
            return (
              <line key={i} x1={c.x1} y1={c.y1} x2={c.x2} y2={c.y2} stroke="#94a3b8" strokeWidth={full ? 1.8 : 1} markerEnd="url(#arrow)" strokeOpacity={opacity} />
            );
          })}

          {/* render nodes */}
          {col1.map(p => (
            <PassiveNode 
              key={p.name}
              name={p.name}
              position={positions[p.name]}
              isEvolved={false}
              highlightedChain={highlightedChain}
              passiveCategories={passiveCategories}
              onNodeHover={onNodeHover}
              onNodeLeave={onNodeLeave}
              setSelected={setSelected}
              selected={selected}
            />
          ))}
          {col2.map(p => (
            <PassiveNode 
              key={p.name}
              name={p.name}
              position={positions[p.name]}
              isEvolved={false}
              highlightedChain={highlightedChain}
              passiveCategories={passiveCategories}
              onNodeHover={onNodeHover}
              onNodeLeave={onNodeLeave}
              setSelected={setSelected}
              selected={selected}
            />
          ))}
          {col3.map(p => (
            <PassiveNode 
              key={p.name}
              name={p.name}
              position={positions[p.name]}
              isEvolved={false}
              highlightedChain={highlightedChain}
              passiveCategories={passiveCategories}
              onNodeHover={onNodeHover}
              onNodeLeave={onNodeLeave}
              setSelected={setSelected}
              selected={selected}
            />
          ))}
          {col4.map(e => (
            <PassiveNode 
              key={e.name}
              name={e.name}
              position={positions[e.name]}
              isEvolved={true}
              highlightedChain={highlightedChain}
              passiveCategories={passiveCategories}
              onNodeHover={onNodeHover}
              onNodeLeave={onNodeLeave}
              setSelected={setSelected}
              selected={selected}
            />
          ))}
        </svg>

        {/* bottom-left tooltip panel (fixed inside graph container) */}
        {(selected || hovered) && (
          <PassiveTooltip 
            selected={selected} 
            hovered={hovered} 
            tooltipTop={tooltipTop} 
            containerRef={containerRef} 
          />
        )}
      </div>
    </div>
  );
}

export default PassivesGraph;