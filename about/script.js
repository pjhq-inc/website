function restartAnimation() {
    const elements = document.querySelectorAll('#zeldalord, #pixelatedface, #carrot, #reclipse, #zilla, #flop, #uwudwagon, #sqrt');
    
    
    elements.forEach((element) => {
        element.style.animation = 'none'; 
        
        element.offsetHeight; 
        element.style.animation = '';
    });
}


setInterval(restartAnimation, 42000);
