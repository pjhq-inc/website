document.addEventListener('DOMContentLoaded', () => {
    const checkoutForm = document.getElementById('checkout-form');

    checkoutForm.addEventListener('submit', (e) => {
        e.preventDefault();

        const formData = new FormData(checkoutForm);
        const data = Object.fromEntries(formData.entries());

        // Here you would typically send the data to a server
        console.log('Order Data:', data);

        alert('Order placed successfully!');
        window.location.href = '../cart/cart.html';
    });
});