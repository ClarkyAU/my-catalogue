import React from 'react';

const NavButton = ({ label, isActive, onClick, isCategory }) => (
  <button 
    onClick={onClick} 
    style={{
      padding: isCategory ? '10px 25px' : '6px 15px',
      backgroundColor: isActive ? 'var(--theme-color)' : 'transparent',
      border: isCategory ? '3px solid #F5F0E6' : `2px solid ${isActive ? '#F5F0E6' : 'var(--theme-color)'}`,
      color: isActive ? '#121212' : (isCategory ? '#F5F0E6' : 'var(--theme-color)'),
      fontFamily: '"Bungee", cursive',
      fontSize: isCategory ? 'clamp(0.8rem, 2vw, 1.2rem)' : '0.8rem',
      cursor: 'pointer',
      whiteSpace: 'nowrap',
      boxShadow: isCategory && isActive ? '3px 3px 0px #F5F0E6' : (isCategory ? `3px 3px 0px var(--theme-color)` : 'none'),
      transition: 'all 0.1s ease',
      flex: '0 1 auto' 
    }}
  >
    {label}
  </button>
);

export const Navigation = ({ catalogue, activeCategory, activeProduct, navigateTo }) => (
  <div style={{ width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
    <nav className="nav-row">
      {Object.keys(catalogue).map(catKey => (
        <NavButton 
          key={catKey} label={catalogue[catKey].displayName} isCategory 
          isActive={activeCategory === catKey} 
          onClick={() => navigateTo(catKey, Object.keys(catalogue[catKey].products)[0])} 
        />
      ))}
    </nav>

    {catalogue[activeCategory] && (
      <nav className="nav-row" style={{ marginBottom: '40px' }}>
        {Object.keys(catalogue[activeCategory].products).map(prodKey => (
          <NavButton 
            key={prodKey} label={catalogue[activeCategory].products[prodKey].displayName} 
            isActive={activeProduct === prodKey} 
            onClick={() => navigateTo(activeCategory, prodKey)} 
          />
        ))}
      </nav>
    )}
  </div>
);