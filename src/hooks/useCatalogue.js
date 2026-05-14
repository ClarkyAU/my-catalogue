import { useState, useEffect } from 'react';

const DEFAULT_COLOR = '#00E5FF';

export const useCatalogue = () => {
  const [catalogue, setCatalogue] = useState({});
  const [activeCategory, setActiveCategory] = useState("");
  const [activeProduct, setActiveProduct] = useState("");
  const [activeTheme, setActiveTheme] = useState({ themeColor: DEFAULT_COLOR });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('catalogue.json')
      .then(res => res.json())
      .then(data => {
        setCatalogue(data);
        const hash = window.location.hash.replace('#', '').split('/');
        if (data[hash[0]]) {
          setActiveCategory(hash[0]);
          setActiveProduct(hash[1] || Object.keys(data[hash[0]].products)[0]);
        } else {
          const firstCat = Object.keys(data)[0];
          setActiveCategory(firstCat || "");
          setActiveProduct(firstCat ? Object.keys(data[firstCat].products)[0] : "");
        }
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (activeCategory) {
      // Logic from image_b1017d.png: Fetching from the products folder
      fetch(`products/${activeCategory}/theme.json`)
        .then(res => res.ok ? res.json() : { themeColor: DEFAULT_COLOR })
        .then(data => setActiveTheme(data))
        .catch(() => setActiveTheme({ themeColor: DEFAULT_COLOR }));
    }
  }, [activeCategory]);

  const navigateTo = (cat, prod) => {
    setActiveCategory(cat);
    setActiveProduct(prod);
    window.location.hash = `#${cat}/${prod}`;
  };

  return { catalogue, activeCategory, activeProduct, activeTheme, loading, navigateTo };
};