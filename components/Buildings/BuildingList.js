function BuildingList({
  buildingsByCategory,
  filteredCategories,
  selectedBuilding,
  onSelect,
  searchTerm,
  setSearchTerm,
  allItems,
  onHover,
  currentHovered,
  onDragStartFromList
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
                    onMouseEnter: () => onHover && onHover(item.name),
                    onMouseLeave: () => onHover && onHover(null),
                    draggable: true,
                    onDragStart: (e) => {
                      // Call the parent's drag start handler through a prop
                      if (typeof onDragStartFromList === 'function') {
                        onDragStartFromList(e, item, false, null); // not from grid, no instance ID
                      }
                    },
                    className: `p-3 cursor-pointer transition-colors rounded-md mb-2 ${selectedBuilding === item.name || currentHovered === item.name
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