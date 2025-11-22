// Passive category color mappings
export const passiveCategories = {
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

// Helper function to generate icon slug from passive name
export const getPassiveIconSlug = (name) => {
    if (!name) return '';
    return name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
};

// Helper function to get passive icon URL
export const getPassiveIconUrl = (name) => {
    const slug = getPassiveIconSlug(name);
    if (!slug) return '';
    return `icons_passives/${slug}.png`;
};

// Helper function to generate icon slug from building name
export const getBuildingIconSlug = (name) => {
    return name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
};

// Helper function to get building icon URL  
export const getBuildingIconUrl = (name) => {
    const slug = getBuildingIconSlug(name);
    if (!slug) return '';
    return `icons_build/${slug}.jpg`;
};

// Helper function to get category color for buildings
export const getCategoryColor = (category) => {
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
};
