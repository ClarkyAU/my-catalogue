export const Navigation = ({ catalogue, activeCategory, activeProduct, navigateTo }) => (
  <div className="nav-container">
    <nav className="nav-row">
      {Object.keys(catalogue).map(catKey => (
        <button 
          key={catKey} 
          className={`nav-btn category ${activeCategory === catKey ? 'active' : ''}`}
          onClick={() => navigateTo(catKey, Object.keys(catalogue[catKey].products)[0])}
        >
          {catalogue[catKey].displayName}
        </button>
      ))}
    </nav>

    {catalogue[activeCategory] && (
      <nav className="nav-row product-nav">
        {Object.keys(catalogue[activeCategory].products).map(prodKey => (
          <button 
            key={prodKey} 
            className={`nav-btn product ${activeProduct === prodKey ? 'active' : ''}`}
            onClick={() => navigateTo(activeCategory, prodKey)}
          >
            {catalogue[activeCategory].products[prodKey].displayName}
          </button>
        ))}
      </nav>
    )}
  </div>
);