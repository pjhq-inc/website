document.addEventListener('DOMContentLoaded', function() {
    const pexButton = document.getElementById('pex-download');
    
    if (pexButton) {
        pexButton.addEventListener('click', function() {
            const pexUrl = '../../PJNH-2.0.zip';
            const link = document.createElement('a');
            link.href = pexUrl;
            link.download = 'PJHQ-PEX.zip';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            
            const originalText = this.textContent;
            this.textContent = 'Downloading...';
            this.disabled = true;
            
            setTimeout(() => {
                this.textContent = originalText;
                this.disabled = false;
            }, 2000);
        });
    }
});