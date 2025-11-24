import React from 'react';

function BuildingList({ 
  buildingsByCategory, 
  filteredCategories, 
  selectedBuilding, 
  onSelect, 
  searchTerm, 
  setSearchTerm,
  allItems
}) {
  return (
    <div className="flex flex-col bg-slate-800 border-r border-slate-700 flex-shrink-0" style={{ width: 300 }}>
      {/* Search Bar */}
      <div className="p-4 border-b border-slate-700">
        <input
          type="text"
          placeholder="Search buildings & tiles..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full px-3 py-2 bg-slate-700 text-white rounded border border-slate-600 focus:outline-none focus:border-blue-500 placeholder-slate-400"
        />
        {/* Category Badge Buttons */}
        <div className="mt-3">
          <div className="flex flex-wrap gap-2">
            {Object.keys(buildingsByCategory).map(category => (
              <button
                key={category}
                onClick={() => {
                  setSearchTerm(category);
                  onSelect(null);
                }}
                className={`px-3 py-1 rounded-full text-xs font-semibold ${window.helpers.getCategoryColor(category)} cursor-pointer hover:opacity-80 transition-opacity`}
              >
                {category}
              </button>
            ))}
          </div>
        </div>
        <div className="text-xs text-slate-400 mt-2">
          Showing {Object.values(filteredCategories).reduce((acc, val) => acc + val.length, 0)} of {allItems.length} items
        </div>
      </div>

      {/* Building List */}
      <div className="flex-1 overflow-y-auto">
        {Object.keys(filteredCategories).length === 0 ? (
          <div className="p-4 text-slate-400 text-center">No items found</div>
        ) : (
          <div className="space-y-2 p-2">
            {Object.entries(filteredCategories).map(([category, items]) => (
              <div key={category}>
                {items.map((item) => (
                  <div
                    key={item.name}
                    onClick={() => onSelect(item.name)}
                    className={`p-3 cursor-pointer transition-colors rounded-md mb-2 ${selectedBuilding === item.name
                      ? 'bg-blue-900 bg-opacity-50 border-l-4 border-blue-500'
                      : 'bg-slate-800 hover:bg-slate-700 border-l-4 border-transparent'
                      }`}
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="font-bold text-white text-sm">{item.name}</div>
                        <div className="text-xs text-slate-300 line-clamp-2">{item.description}</div>
                      </div>
                      <span className={`px-2 py-1 rounded-full text-xs font-semibold ${window.helpers.getCategoryColor(item.category)}`}>
                        {item.category}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default BuildingList;