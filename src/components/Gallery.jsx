import React, { useState, useEffect } from 'react';

export const Gallery = ({ photos }) => {
  const [index, setIndex] = useState(0);

  // Reset index when product changes
  useEffect(() => setIndex(0), [photos]);

  return (
    <div className="gallery-pane">
      <div className="main-image-container">
        {photos?.length > 0 ? (
          <img src={photos[index]} className="main-img" alt="" />
        ) : (
          <div style={{ fontFamily: '"Space Mono", monospace', color: 'var(--theme-color)' }}>PICTURE TO COME</div>
        )}
      </div>
      {photos?.length > 1 && (
        <div className="thumbnail-row">
          {photos.map((img, i) => (
            <img key={i} src={img} onClick={() => setIndex(i)} 
                 className={`thumb ${index === i ? 'active' : ''}`} alt="" />
          ))}
        </div>
      )}
    </div>
  );
};