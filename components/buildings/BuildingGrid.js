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
  onBuildingHover,
  onBuildingLeave,
  getOccupiedPositions,
  draggedBuilding,
  wasDraggedFromGrid,
  draggedInstanceId,
  draggedBuildingRotation, // New prop
  rotateShape, // New prop
  clearLayout,
  showConfirm,
  setShowConfirm
}) {

  const getShape = (building) => {
    if (building.shape) {
      return building.shape;
    }
    const shape = [];
    const width = building.size?.w ?? 2;
    const height = building.size?.h ?? 2;
    for (let r = 1; r <= height; r++) {
      for (let c = 1; c <= width; c++) {
        shape.push([c, r]);
      }
    }
    return shape;
  };

  return React.createElement(
    'div', { className: "flex flex-col flex-1 bg-slate-800 rounded-lg p-2 border-2 border-dashed border-slate-600 overflow-hidden relative" },
    error && React.createElement('div', { className: "bg-red-500 text-white text-center p-2 rounded-md mb-2 flex-shrink-0" }, error),
    React.createElement(
      'div', { className: "bg-slate-800 rounded-lg p-2 border-2 border-dashed border-slate-600 overflow-auto flex-1 min-h-0", onDragOver: handleDragOver, onDragLeave: handleDragLeave, onDrop: handleDrop },
      React.createElement(
        'div',
        {
          id: "buildingGrid",
          className: "grid grid-cols-40 grid-rows-30 gap-0 bg-slate-800 rounded relative",
          style: { width: '1200px', height: '900px', display: 'grid', gridTemplateRows: 'repeat(30, 30px)', gridTemplateColumns: 'repeat(40, 30px)' }
        },
        React.createElement('div', { className: "absolute top-2 left-2 bg-black/50 text-white text-sm px-2 py-1 rounded pointer-events-none z-30", style: { fontSize: '12px', fontWeight: 'bold' } }, `${placedBuildings.length} building${placedBuildings.length !== 1 ? 's' : ''} placed`),
        React.createElement(
          'div', { className: "absolute inset-0 pointer-events-none", style: { width: '1200px', height: '900px' } },
          [1, 2, 3, 4].map(i => React.createElement('div', { key: `v-chunk-${i}`, className: "absolute bg-yellow-500/40", style: { left: `${i * 8 * 30}px`, top: 0, width: '2px', height: '100%' } })),
          [1, 2, 3, 4].map(i => React.createElement('div', { key: `h-chunk-${i}`, className: "absolute bg-yellow-500/40", style: { left: 0, top: `${i * 6 * 30}px`, width: '100%', height: '2px' } }))
        ),
        React.createElement(
            'div', { className: "absolute inset-0 grid grid-cols-40 grid-rows-30" },
            Array.from({ length: 30 * 40 }).map((_, index) => {
                const row = Math.floor(index / 40);
                const col = index % 40;
                return React.createElement('div', { key: `cell-${index}`, className: "border border-slate-700/50 hover:bg-slate-700/20 transition-colors", style: { gridColumn: col + 1, gridRow: row + 1 } });
            })
        ),

        // Preview building placement
        previewPosition && draggedBuilding && rotateShape(getShape(draggedBuilding), draggedBuildingRotation).map((part, index) => {
          const c = part[0] - 1;
          const r = part[1] - 1;
          return React.createElement('div', {
            key: `preview-${index}`,
            className: "absolute bg-blue-500/30 border border-blue-400 pointer-events-none z-10",
            style: {
              gridRow: `${previewPosition.row + r + 1}`,
              gridColumn: `${previewPosition.col + c + 1}`,
              width: '30px',
              height: '30px'
            }
          });
        }),

        // Placed buildings
        placedBuildings.map((building) => {
            const rotatedShape = rotateShape(getShape(building.building), building.rotation);
            const width = Math.max(0, ...rotatedShape.map(p => p[0]));
            const height = Math.max(0, ...rotatedShape.map(p => p[1]));

            return React.createElement(
                React.Fragment,
                { key: building.instanceId },
                rotatedShape.map((part, index) => {
                  const c = part[0] - 1;
                  const r = part[1] - 1;
                  return React.createElement('div', {
                    key: `${building.instanceId}-${index}`,
                    className: "absolute bg-gradient-to-br from-slate-600 to-slate-800 border border-slate-400/30 z-20",
                    style: {
                        gridRow: building.row + r + 1,
                        gridColumn: building.col + c + 1,
                        width: '30px',
                        height: '30px',
                        cursor: 'move',
                        background: building.building.color || 'linear-gradient(135deg, #475569, #1e293b)',
                    },
                    draggable: true,
                    onDragStart: (e) => handleDragStart(e, building.building, true, building.instanceId),
                    onContextMenu: (e) => { e.preventDefault(); onRemove(building.instanceId); },
                    onMouseEnter: () => onBuildingHover(building.building.name),
                    onMouseLeave: () => onBuildingLeave(),
                  });
                }),
                React.createElement('div', {
                    style: {
                        gridArea: `${building.row + 1} / ${building.col + 1} / span ${height} / span ${width}`,
                        pointerEvents: 'none',
                        zIndex: 22,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                    }
                }, React.createElement('img', {
                    src: window.helpers.getBuildingIconUrl(building.building.name),
                    alt: building.building.name,
                    className: "object-contain",
                    style: {
                        imageRendering: 'pixelated',
                        width: `${width * 30}px`,
                        height: `${height * 30}px`,
                    }
                }))
            );
        }),

        // Floating clear layout button at the bottom right of the grid
        React.createElement('button', {
          className: "absolute bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-md transition-colors text-sm font-medium min-w-[120px] z-40",
          onClick: clearLayout,
          onMouseLeave: () => setShowConfirm(false),
          style: { bottom: '10px', right: '10px' }
        }, showConfirm ? "Really?" : "Clear Layout")
      )
    )
  );
}