document.addEventListener('DOMContentLoaded', () => {
    const cartItems = document.getElementById('cart-items');
    const totalPrice = document.getElementById('total-price');
    const checkoutButton = document.getElementById('checkout-button');

    let cart = [
        //GetSelectedItems();
    ];

    let total = 0;

    cart.forEach(item => {
        const itemTotal = item.price * item.quantity;
        total += itemTotal;

        const itemElement = document.createElement('div');
        itemElement.classList.add('cart-item');
        itemElement.innerHTML = `
            <p>${item.name} - $${item.price.toFixed(2)} x ${item.quantity}</p>
            <p>$${itemTotal.toFixed(2)}</p>
        `;
        cartItems.appendChild(itemElement);
    });

    totalPrice.textContent = `$${total.toFixed(2)}`;

    checkoutButton.addEventListener('click', () => {
        window.location.href = '../checkout/checkout.html';
    });
});