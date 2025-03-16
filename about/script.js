function restartAnimation() {
    const elements = document.querySelectorAll('#zeldalord, #pixelatedface, #carrot');
    
    
    elements.forEach((element) => {
        element.style.animation = 'none'; 
        
        element.offsetHeight; 
        element.style.animation = '';
    });
}


setInterval(restartAnimation, 42000);
