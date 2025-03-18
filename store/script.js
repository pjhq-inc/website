fetch('../src/data/json/pexinator.json')
  .then(response => response.json())
  .then(data => {
    const product = data.product;
    const productDetails = document.getElementById('product-details');

    const productHTML = `
      <div class="product">
        <h2>${product.name}</h2>
        <img src="${product.images[0]}" alt="${product.name}" class="product-image">
        <p class="price">Price: $${product.price.toFixed(2)}</p>
        <p class="description">${product.description}</p>
        <h3>Features:</h3>
        <ul class="features">
          ${product.features.map(feature => `<li>${feature}</li>`).join('')}
        </ul>
        <h3>Specifications:</h3>
        <ul class="specifications">
          <li><strong>Weight:</strong> ${product.specifications.weight}</li>
          <li><strong>Dimensions:</strong> ${product.specifications.dimensions}</li>
          <li><strong>Color:</strong> ${product.specifications.color}</li>
          <li><strong>Material:</strong> ${product.specifications.material}</li>
        </ul>
        <h3>Reviews:</h3>
        <div class="reviews">
          ${product.reviews.map(review => `
            <div class="review">
              <p><strong>${review.user}</strong> - ${'⭐'.repeat(review.rating)}</p>
              <p>${review.comment}</p>
            </div>
          `).join('')}
        </div>
        <div class="actions">
          <a href="${product.links.addToCart}" class="btn">Add to Cart</a>
          <a href="${product.links.buyNow}" class="btn">Buy Now</a>
        </div>
      </div>
    `;

    
    productDetails.innerHTML = productHTML;
  })
  .catch(error => {
    console.error('Error fetching product data:', error);
    document.getElementById('product-details').innerHTML = '<p>Failed to load product details. Please try again later.</p>';
  });