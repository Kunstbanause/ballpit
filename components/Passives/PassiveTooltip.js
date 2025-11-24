function PassiveTooltip({ selected, hovered, tooltipRef }) {
  const name = selected || (hovered && hovered.name);
  if (!name) return null;

  const evo = window.passivesData.evolvedPassives.find(e => e.name === name);
  const b = window.passivesData.basePassives.find(bi => bi.name === name);

  return React.createElement(
    'div',
    {
      ref: tooltipRef,
      className: "w-full h-full backdrop-blur-sm rounded-lg p-4 max-w-md"
    },
    React.createElement('div', { className: "text-white mb-2" },
      React.createElement('div', { className: "font-semibold" }, name),
      React.createElement('div', { className: "font-normal text-slate-200 mt-1" },
        evo ? evo.description || '' : b ? b.description || '' : ''
      )
    ),
    b && b.requirement && b.requirement !== 'N/A' && React.createElement(
      'div',
      { className: "text-amber-300 text-sm mb-2 border-l-2 border-amber-300 pl-2" },
      React.createElement('strong', null, "Requirement:"),
      " ",
      b.requirement
    ),
    evo && React.createElement(
      'div',
      { className: "text-slate-300 text-sm" },
      React.createElement('div', null, "Ingredients: ", (evo.ingredients || []).join(' + '))
    )
  );
}