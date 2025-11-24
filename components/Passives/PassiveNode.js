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