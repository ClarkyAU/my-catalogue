import React from 'react';

export const Header = () => {
  return (
    <header className="site-header">
      {/* The link wraps the h1, pointing to the empty hash (Home) */}
      <a href="#" style={{ textDecoration: 'none', color: 'inherit' }}>
        <h1>CLARKY<span>3D</span></h1>
      </a>
    </header>
  );
};