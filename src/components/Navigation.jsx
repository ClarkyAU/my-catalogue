import React from 'react';

export const Navigation = ({ catalogue = {}, activeCategory, activeProduct, navigateTo }) => {
  const activeHub = activeCategory ? 'prints' : 'featured';
  
  const categoryKeys = Object.keys(catalogue);
  const firstCategoryId = categoryKeys.length > 0 ? categoryKeys[0] : '';

  return (
    <div className="nav-container">
      
      {/* TIER 1: MAIN HUBS */}
      <nav className="nav-row main-hubs">
        <button 
          className={`nav-btn hub-btn ${activeHub === 'featured' ? 'active' : ''}`}
          onClick={() => {
            window.location.hash = ''; 
            if (navigateTo) navigateTo(null, null);
          }} 
        >
          [ NEW PRODUCTS ]
        </button>
        
        <button 
          className={`nav-btn hub-btn ${activeHub === 'prints' ? 'active' : ''}`}
          onClick={() => {
            if (firstCategoryId && navigateTo) {
              navigateTo(firstCategoryId, null); 
            }
          }}
        >
          [ THE CATALOGUE ]
        </button>
        
        <button 
          className="nav-btn hub-btn" 
          onClick={(e) => { e.preventDefault(); alert("Colours Library Coming Soon!"); }}
        >
          [ COLOURS ]
        </button>
      </nav>

      {/* TIER 2: SUB-CATEGORIES */}
      {activeHub === 'prints' && (
        <nav className="nav-row sub-nav">
          {categoryKeys.map(key => {
            const cat = catalogue[key];
            return (
              <button 
                key={key} 
                className={`nav-btn category ${activeCategory === key ? 'active' : ''}`}
                onClick={() => navigateTo && navigateTo(key, null)} 
              >
                {cat.displayName}
              </button>
            );
          })}
        </nav>
      )}
      
    </div>
  );
};