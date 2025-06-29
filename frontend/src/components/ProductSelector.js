import React, { useEffect, useState } from 'react';
import { getProducts } from '../api';

function ProductSelector({ selectedProducts, onChange }) {
  const [products, setProducts] = useState([]);

  useEffect(() => {
    getProducts().then(setProducts);
  }, []);

  const handleToggle = productId => {
    if (selectedProducts.includes(productId)) {
      onChange(selectedProducts.filter(id => id !== productId));
    } else {
      onChange([...selectedProducts, productId]);
    }
  };

  const allProductIds = products.map(p => p.productId);
  const allSelected = allProductIds.length > 0 && allProductIds.every(id => selectedProducts.includes(id));

  const handleSelectDeselectAll = () => {
    if (allSelected) {
      onChange([]); // Deselect all
    } else {
      onChange(allProductIds); // Select all
    }
  };

  // Helper to extract the first number from the end of a product name for sorting
  const extractLastNumber = (name) => {
    const matches = name.match(/\d+/g);
    return matches && matches.length > 0 ? parseInt(matches[matches.length - 1], 10) : Infinity;
  };

  // Categorize products by keywords in their names
  const categorizeProducts = (products) => {
    const categories = {
      'Milkshakes': [],
      'Paneer': [],
      'Whey Protein': [],
      'Lassi': [],
      'Buttermilk': [],
      'Milk': [],
      'Other': []
    };
    products.forEach(product => {
      const name = product.name.toLowerCase();
      if (name.includes('milkshake')) categories['Milkshakes'].push(product);
      else if (name.includes('paneer')) categories['Paneer'].push(product);
      else if (name.includes('whey')) categories['Whey Protein'].push(product);
      else if (name.includes('lassi')) categories['Lassi'].push(product);
      else if (name.includes('buttermilk')) categories['Buttermilk'].push(product);
      else if (name.match(/\bmilk\b/)) categories['Milk'].push(product);
      else categories['Other'].push(product);
    });
    // Sort each category by the last number in the product name, then alphabetically
    Object.keys(categories).forEach(cat => {
      categories[cat].sort((a, b) => {
        const numA = extractLastNumber(a.name);
        const numB = extractLastNumber(b.name);
        if (numA !== numB) return numA - numB;
        return a.name.localeCompare(b.name);
      });
    });
    return categories;
  };

  const categorized = categorizeProducts(products);

  return (
    <div>
      <h3>Select products to get notified about:</h3>
      <button type="button" onClick={handleSelectDeselectAll} style={{ marginBottom: 10 }}>
        {allSelected ? 'Deselect all' : 'Select all'}
      </button>
      {products.length === 0 && <div>Loading products...</div>}
      {Object.entries(categorized).map(([cat, items]) =>
        items.length > 0 && (
          <div key={cat} style={{ marginBottom: 18 }}>
            <h4 style={{ marginBottom: 8 }}>{cat}</h4>
            <ul className="product-list">
              {items.map(product => (
                <li key={product.productId}>
                  <label>
                    <input
                      type="checkbox"
                      checked={selectedProducts.includes(product.productId)}
                      onChange={() => handleToggle(product.productId)}
                    />
                    {product.name}
                  </label>
                </li>
              ))}
            </ul>
          </div>
        )
      )}
    </div>
  );
}

export default ProductSelector;
