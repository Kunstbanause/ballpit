function BallNode({ name, position, isHighlighted, onClick, onHover, onLeave, nameMap, baseHeight = 45, searchTerm = '', opacity = 1 }) {
  const displayName = nameMap[name] || name;
  const urls = window.helpers.getIconUrls(displayName);
  const imgSize = 36;
  const padding = 5;
  const imgX = position.x + padding;
  const imgY = position.y + (baseHeight - imgSize) / 2;
  const primary = urls[0];

  const textX = position.x + padding + imgSize + padding;
  const textY = position.y + baseHeight / 2;

  // Check if this node matches the search term
  const matchesSearch = searchTerm && displayName.toLowerCase().includes(searchTerm);
  // The final highlight state considers both selection and search matches
  const finalHighlight = isHighlighted || matchesSearch;

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
      stroke: finalHighlight ? '#fff' : 'none',
      strokeWidth: finalHighlight ? 2 : 0,
      opacity: opacity * (finalHighlight ? 1 : 0.7),
      className: "cursor-pointer transition-all hover:opacity-100",
      onClick: onClick,
      onMouseEnter: onHover,
      onMouseLeave: onLeave
    }),
    primary && React.createElement('image', {
      href: primary,
      x: imgX,
      y: imgY,
      width: imgSize,
      height: imgSize,
      preserveAspectRatio: "xMidYMid slice",
      onError: (e) => { e.target.style.display = 'none'; },
      className: "pointer-events-none select-none",
      onMouseEnter: onHover,
      onMouseLeave: onLeave
    }),
    React.createElement('text', {
      x: textX,
      y: textY - (lines.length > 1 ? (lines.length - 1) * 6 : 0),
      textAnchor: "start",
      dominantBaseline: "middle",
      fontSize: displayName.length > 15 ? "10" : "11",
      fontWeight: "bold",
      fill: "white",
      className: "pointer-events-none select-none",
      onMouseEnter: onHover,
      onMouseLeave: onLeave
    },
      lines.map((line, i) =>
        React.createElement('tspan', { key: i, x: textX, dy: i === 0 ? 0 : '1.2em' }, line)
      )
    )
  );
}