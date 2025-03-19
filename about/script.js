function restartAnimation() {
    const elements = document.querySelectorAll('#zeldalord, #uwudwagon, #pixelatedface, #carrot, #reclipse, #zilla, #flop, #sqrt');
    
    
    elements.forEach((element) => {
        element.style.animation = 'none'; 
        
        element.offsetHeight; 
        element.style.animation = '';
    });
}


setInterval(restartAnimation, 42000);
