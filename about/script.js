function restartAnimation() {
    const elements = document.querySelectorAll('#zeldalord, #pixelatedface, #carrot');
    
    
    elements.forEach((element) => {
        element.style.animation = 'none'; 
        
        element.offsetHeight; 
        element.style.animation = '';
    });
}


setInterval(restartAnimation, 18000); // Each card is on screen for 6s, add +6000 for every addition card, this is for the current 3 (me,pixel,carrot)
