// This file only contains the main App component that handles tab navigation and routing.
// All other components and hooks have been extracted to separate files.

function App() {
  const [tab, setTab] = React.useState(() => {
    const hash = window.location.hash.slice(1);
    if (hash === 'balls') return 'Evolutions';
    if (hash === 'passives') return 'Passives';
    if (hash === 'buildings' || hash.startsWith('buildings-')) return 'Buildings';
    return 'Evolutions';
  });
  const [ballSearchTerm, setBallSearchTerm] = React.useState('');

  React.useEffect(() => {
    const handleHashChange = () => {
      const hash = window.location.hash.slice(1);
      if (hash === 'balls') setTab('Evolutions');
      else if (hash === 'passives') setTab('Passives');
      else if (hash === 'buildings' || hash.startsWith('buildings-')) setTab('Buildings');
      else setTab('Evolutions');
    };
    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  const handleTabChange = (tabName, hash) => {
    setTab(tabName);
    window.location.hash = hash;
  };

  return React.createElement(
    'div',
    { className: "w-full h-screen bg-gradient-to-br from-slate-900 to-slate-950 p-6 overflow-y-auto" },
    React.createElement(
      'div',
      { className: "max-w-full" },
      React.createElement(
        'div',
        { className: "flex items-center gap-3 mb-4" },
        React.createElement('h1', { className: "text-4xl font-bold text-white mb-0" }, "Ball x Pit"),
        React.createElement(
          'div',
          { className: "inline-flex rounded-md bg-slate-800/40 p-1" },
          React.createElement(
            'button',
            {
              onClick: () => handleTabChange('Evolutions', 'balls'),
              className: `px-3 py-1 rounded ${tab === 'Evolutions' ? 'bg-slate-700 text-white' : 'text-slate-300'}`
            },
            "Evolutions"
          ),
          React.createElement(
            'button',
            {
              onClick: () => handleTabChange('Passives', 'passives'),
              className: `ml-2 px-3 py-1 rounded ${tab === 'Passives' ? 'bg-slate-700 text-white' : 'text-slate-300'}`
            },
            "Passives"
          ),
          React.createElement(
            'button',
            {
              onClick: () => handleTabChange('Buildings', 'buildings'),
              className: `ml-2 px-3 py-1 rounded ${tab === 'Buildings' ? 'bg-slate-700 text-white' : 'text-slate-300'}`
            },
            "Buildings"
          )
        )
      ),

      tab === 'Evolutions' && React.createElement(BallEvolutionGraph),
      tab === 'Passives' && React.createElement(PassivesGraph),
      tab === 'Buildings' && React.createElement(BuildingsViewer),

      React.createElement(
        'footer',
        { className: "mt-6 text-slate-400 text-sm text-center" },
        "Rights to their respective owners: ",
        React.createElement(
          'a',
          { href: "https://store.steampowered.com/app/2062430/BALL_x_PIT/", target: "_blank", rel: "noopener noreferrer", className: "text-slate-200 underline" },
          "Ball X Pit"
        ),
        " / ",
        React.createElement(
          'a',
          { href: "https://www.devolverdigital.com/", target: "_blank", rel: "noopener noreferrer", className: "text-slate-200 underline" },
          "Devolver Digital"
        ),
        ". Data from: ",
        React.createElement(
          'a',
          { href: "https://ballpit.fandom.com/wiki/Ball_X_Pit_Wiki", target: "_blank", rel: "noopener noreferrer", className: "text-slate-200 underline" },
          "Ball X Pit Wiki"
        ),
        "."
      )
    )
  );
}