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