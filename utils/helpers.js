window.helpers = {
  getPassiveIconSlug: (name) => {
    if (!name) return '';
    return name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
  },

  getPassiveIconUrl: (name) => {
    const slug = window.helpers.getPassiveIconSlug(name);
    if (!slug) return '';
    return `icons_passives/${slug}.png`;
  },

  getBuildingIconSlug: (name) => name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, ''),

  getBuildingIconUrl: (name) => {
    const slug = window.helpers.getBuildingIconSlug(name);
    if (!slug) return '';
    return `icons_build/${slug}.png`;
  },

  getColor: (element) => {
    const colors = {
      'BLEED': '#ae5353', 'BROOD MOTHER': '#8a5ab5', 'BURN': '#b56c46', 'CELL': '#4b9265', 'CHARM': '#ae547c',
      'DARK': '#1f2937', 'EARTHQUAKE': '#9a6a45', 'EGG SAC': '#739247', 'FREEZE': '#448999', 'GHOST': '#475569',
      'IRON': '#64748b', 'LASER': '#b59a44', 'LASER (HORIZONTAL)': '#b59a44', 'LASER (VERTICAL)': '#b59a44',
      'LIGHT': '#bda64b', 'LIGHTNING': '#6863b3', 'POISON': '#438b75', 'VAMPIRE': '#9f4c6f', 'WIND': '#427591',
    };
    if (window.jsonData && window.jsonData.evolutions) {
      const evoColorSource = window.jsonData.evolutions.find(e => e.name.toUpperCase().replace(/\s/g, ' ') === element);
      if (evoColorSource) return colors[evoColorSource.ingredients[0].toUpperCase().replace(/\s/g, ' ')] || '#6b7280';
    }
    return colors[element] || '#6b7280';
  },

  getIconSlug: (name) => {
    if (!name) return '';
    return name.toLowerCase().replace(/ /g, '-').replace(/[^a-z0-9-]/g, '');
  },

  getIconUrls: (name) => {
    const slug = window.helpers.getIconSlug(name);
    if (!slug) return [];
    return [`icons/${slug}.png`];
  },

  getCategoryColor: (category) => {
    const colors = {
      'Economy': 'bg-green-900 text-green-200',
      'Warfare': 'bg-red-900 text-red-200',
      'Housing': 'bg-purple-900 text-purple-200',
      'Trophy': 'bg-gray-700 text-gray-200',
      'Resource': 'bg-emerald-800 text-emerald-200',
      'Commerce': 'bg-yellow-900 text-yellow-200',
      'Utility': 'bg-cyan-900 text-cyan-200',
      'Production': 'bg-orange-900 text-orange-200',
      'Government': 'bg-rose-900 text-rose-200',
      'Training': 'bg-indigo-900 text-indigo-200',
    };
    return colors[category] || 'bg-slate-800 text-gray-200';
  }
};
