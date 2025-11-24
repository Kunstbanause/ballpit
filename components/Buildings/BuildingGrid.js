function BuildingGrid({
  placedBuildings,
  previewPosition,
  onPlace,
  onRemove,
  error,
  handleDragOver,
  handleDragLeave,
  handleDrop,
  handleDragStart,
  getOccupiedPositions,
  draggedBuilding,
  wasDraggedFromGrid,
  draggedInstanceId
}) {
  return React.createElement(
    'div',
    { className: "bg-slate-800 rounded-lg p-2 border-2 border-dashed border-slate-600 flex-1 flex flex-col min-h-0" },
    // Placement Error Message
    error && React.createElement(
      'div',
      { className: "bg-red-500 text-white text-center p-2 rounded-md mb-2" },
      error
    ),

    // Building Placement Grid
    React.createElement(
      'div',
      {
        className: "bg-slate-800 rounded-lg p-2 border-2 border-dashed border-slate-600 flex-1 flex-col min-h-0",
        onDragOver: handleDragOver,
        onDragLeave: handleDragLeave,
        onDrop: handleDrop
      },
      React.createElement(
        'div',
        {
          id: "buildingGrid",
          className: "grid grid-cols-40 grid-rows-30 gap-0 bg-slate-800 rounded flex-1 overflow-auto relative",
          style: {
            maxHeight: '100%',
            width: '100%',
            display: 'grid',
            gridTemplateRows: 'repeat(30, 30px)',
            gridTemplateColumns: 'repeat(40, 30px)'
          }
        },
        // Chunk borders - 8x6 blocks
        React.createElement(
          'div',
          {
            className: "absolute inset-0 pointer-events-none",
            style: {
              width: '1200px',
              height: '900px',
            }
          },
          // Draw vertical chunk borders every 8 cells (240px)
          [1, 2, 3, 4].map(i =>
            React.createElement(
              'div',
              {
                key: `v-chunk-${i}`,
                className: "absolute bg-yellow-500/40",
                style: {
                  left: `${i * 8 * 30}px`,
                  top: 0,
                  width: '2px',
                  height: '100%'
                }
              }
            )
          ),
          // Draw horizontal chunk borders every 6 cells (180px)
          [1, 2, 3, 4].map(i =>
            React.createElement(
              'div',
              {
                key: `h-chunk-${i}`,
                className: "absolute bg-yellow-500/40",
                style: {
                  left: 0,
                  top: `${i * 6 * 30}px`,
                  width: '100%',
                  height: '2px'
                }
              }
            )
          )
        ),

        // Grid background - empty cells
        React.createElement(
          'div',
          {
            className: "absolute inset-0 grid grid-cols-40 grid-rows-30",
          },
          Array.from({ length: 30 * 40 }).map((_, index) => {
            const row = Math.floor(index / 40);
            const col = index % 40;
            return React.createElement(
              'div',
              {
                key: `cell-${index}`,
                className: "border border-slate-700/50 hover:bg-slate-700/20 transition-colors relative",
                style: {
                  gridColumn: col + 1,
                  gridRow: row + 1,
                }
              }
            );
          })
        ),

        // Preview building placement
        previewPosition && draggedBuilding && React.createElement(
          'div',
          {
            className: "absolute bg-blue-500/30 border-2 border-blue-400 pointer-events-none z-10",
            style: {
              gridArea: `${previewPosition.row + 1} / ${previewPosition.col + 1} / span ${draggedBuilding.size?.h ?? 2} / span ${draggedBuilding.size?.w ?? 2}`,
              width: `calc(${(draggedBuilding.size?.w ?? 2) * 30}px - 2px)`,
              height: `calc(${(draggedBuilding.size?.h ?? 2) * 30}px - 2px)`,
            }
          }
        ),

        // Placed buildings
        placedBuildings.map((building) => {
          const positions = getOccupiedPositions(building.row, building.col, building.building.size?.w ?? 2, building.building.size?.h ?? 2);
          return React.createElement(
            'div',
            {
              key: building.instanceId,
              className: "absolute bg-gradient-to-br from-slate-600 to-slate-800 rounded border border-slate-400/30 flex flex-col items-center justify-center p-1 cursor-move z-20",
              style: {
                gridArea: `${building.row + 1} / ${building.col + 1} / span ${building.building.size?.h ?? 2} / span ${building.building.size?.w ?? 2}`,
                width: `calc(${(building.building.size?.w ?? 2) * 30}px - 2px)`,
                height: `calc(${(building.building.size?.h ?? 2) * 30}px - 2px)`,
                background: building.building.color || 'linear-gradient(135deg, #475569, #1e293b)',
              },
              draggable: true,
              onDragStart: (e) => {
                e.dataTransfer.setData('text/plain', building.building.name);
                // Call parent drag handler with building data
                if (typeof handleDragStart === 'function') {
                  handleDragStart(e, building.building, true, building.instanceId);
                }
              }
            },
            React.createElement(
              'div',
              { className: "flex items-center justify-center h-full" },
              React.createElement(
                'img',
                {
                  src: window.helpers.getBuildingIconUrl(building.building.name),
                  alt: building.building.name,
                  className: "max-w-[80%] max-h-[80%] object-contain",
                  onError: (e) => {
                    e.target.style.display = 'none';
                  }
                }
              )
            ),
            React.createElement(
              'div',
              { className: "absolute bottom-0 left-0 right-0 bg-black/70 text-white text-[8px] px-1 truncate" },
              building.building.name
            )
          );
        })
      )
    )
  );
}