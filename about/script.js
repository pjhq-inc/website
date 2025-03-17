function restartAnimation() {
    const elements = document.querySelectorAll('#zeldalord, #uwudwagon, #carrot, #reclipse, #zilla, #flop, #pixelatedface, #sqrt');
    
    
    elements.forEach((element) => {
        element.style.animation = 'none'; 
        
        element.offsetHeight; 
        element.style.animation = '';
    });
}


setInterval(restartAnimation, 42000);
