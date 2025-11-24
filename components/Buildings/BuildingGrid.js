import React, { useState } from 'react';

function BuildingGrid({ 
  placedBuildings, 
  previewPosition, 
  onPlace, 
  onRemove, 
  error,
  handleDragOver,
  handleDragLeave,
  handleDrop,
  getOccupiedPositions,
  draggedBuilding,
  wasDraggedFromGrid,
  draggedInstanceId
}) {
  const [occupiedCells] = useState(() => Array(30 * 40).fill(false));
  
  return (
    <div className="bg-slate-800 rounded-lg p-2 border-2 border-dashed border-slate-600 flex-1 flex flex-col min-h-0">
      {/* Placement Error Message */}
      {error && (
        <div className="bg-red-500 text-white text-center p-2 rounded-md mb-2">
          {error}
        </div>
      )}
      
      {/* Building Placement Grid */}
      <div
        className="bg-slate-800 rounded-lg p-2 border-2 border-dashed border-slate-600 flex-1 flex flex-col min-h-0"
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        <div
          id="buildingGrid"
          className="grid grid-cols-40 grid-rows-30 gap-0 bg-slate-800 rounded flex-1 overflow-auto relative"
          style={{
            maxHeight: '100%',
            width: '100%',
            display: 'grid',
            gridTemplateRows: 'repeat(30, 30px)',
            gridTemplateColumns: 'repeat(40, 30px)'
          }}
        >
          {/* Chunk borders - 8x6 blocks */}
          <div className="absolute inset-0 pointer-events-none"
            style={{
              width: '1200px',
              height: '900px',
            }}>
            {/* Draw vertical chunk borders every 8 cells (240px) */}
            {[1, 2, 3, 4].map(i => (
              <div
                key={`v-chunk-${i}`}
                className="absolute bg-yellow-500/40"
                style={{
                  left: `${i * 8 * 30}px`,
                  top: 0,
                  width: '2px',
                  height: '100%'
                }}
              />
            ))}
            {/* Draw horizontal chunk borders every 6 cells (180px) */}
            {[1, 2, 3, 4].map(i => (
              <div
                key={`h-chunk-${i}`}
                className="absolute bg-yellow-500/40"
                style={{
                  left: 0,
                  top: `${i * 6 * 30}px`,
                  width: '100%',
                  height: '2px'
                }}
              />
            ))}
          </div>

          {/* Grid background - empty cells */}
          <div className="absolute inset-0 grid grid-cols-40 grid-rows-30"
            style={{
              width: '1200px', // 40 * 30
              height: '900px', // 30 * 30
              gridTemplateRows: 'repeat(30, 30px)',
              gridTemplateColumns: 'repeat(40, 30px)'
            }}>
            {Array.from({ length: 30 * 40 }).map((_, index) => {
              const row = Math.floor(index / 40);
              const col = index % 40;

              const isOccupied = occupiedCells[index];
              let isPreview = false;
              if (previewPosition && draggedBuilding) {
                const { w, h } = draggedBuilding.size || { w: 2, h: 2 };
                const previewPositions = getOccupiedPositions(previewPosition.row, previewPosition.col, w, h);
                isPreview = previewPositions.includes(index);
              }

              if (isOccupied || isPreview) {
                return <div key={`bg-${index}`}></div>;
              }

              return (
                <div
                  key={`bg-${index}`}
                  className="border border-slate-700 bg-slate-900/30"
                ></div>
              );
            })}
          </div>

          {/* Preview overlay for dragged building */}
          {previewPosition && draggedBuilding && (
            <div
              className="absolute bg-blue-500/50 border-2 border-dashed border-blue-400"
              style={{
                gridColumn: `${previewPosition.col + 1} / span ${draggedBuilding.size?.w ?? 2}`,
                gridRow: `${previewPosition.row + 1} / span ${draggedBuilding.size?.h ?? 2}`,
              }}
            ></div>
          )}

          {/* Render placed buildings as 2x2 blocks */}
          {placedBuildings.map((placedBuilding) => {
            const { instanceId, building, row, col } = placedBuilding;
            const width = building.size?.w ?? 2;
            const height = building.size?.h ?? 2;

            return (
              <div
                key={`building-${instanceId}`}
                className="absolute bg-blue-700 cursor-pointer"
                style={{
                  gridColumn: `${col + 1} / span ${width}`,
                  gridRow: `${row + 1} / span ${height}`,
                  width: '100%',
                  height: '100%'
                }}
                onContextMenu={(e) => {
                  e.preventDefault();
                  onRemove(instanceId);
                }}
              >
                <img
                  src={window.helpers.getBuildingIconUrl(building.name)}
                  alt={building.name}
                  className="w-full h-full"
                  draggable="true"
                  onDragStart={(e) => {
                    e.dataTransfer.setData('text/plain', building.name);
                    e.dataTransfer.effectAllowed = 'move';
                  }}
                  onError={(e) => {
                    e.target.style.display = 'none';
                  }}
                />
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

export default BuildingGrid;