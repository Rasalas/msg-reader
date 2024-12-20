class FileHandler {
    constructor(messageHandler, uiManager) {
        this.messageHandler = messageHandler;
        this.uiManager = uiManager;
        this.setupEventListeners();
    }

    setupEventListeners() {
        document.addEventListener('dragover', (e) => {
            e.preventDefault();
            this.uiManager.showDropOverlay();
        });

        document.addEventListener('dragleave', (e) => {
            e.preventDefault();
            if (e.clientX <= 0 || e.clientY <= 0 || 
                e.clientX >= window.innerWidth || e.clientY >= window.innerHeight) {
                this.uiManager.hideDropOverlay();
            }
        });

        document.addEventListener('drop', (e) => {
            e.preventDefault();
            this.uiManager.hideDropOverlay();
            this.handleFiles(e.dataTransfer.files);
        });

        // File input handlers
        document.getElementById('fileInput').addEventListener('change', (e) => {
            this.handleFiles(e.target.files);
        });

        document.getElementById('fileInputInApp').addEventListener('change', (e) => {
            this.handleFiles(e.target.files);
        });
    }

    handleFiles(files) {
        Array.from(files).forEach(file => {
            const extension = file.name.toLowerCase().split('.').pop();
            if (extension === 'msg' || extension === 'eml') {
                this.handleFile(file);
            }
        });
    }

    handleFile(file) {
        const reader = new FileReader();
        reader.onload = (e) => {
            const fileBuffer = e.target.result;
            const extension = file.name.toLowerCase().split('.').pop();
            
            let msgInfo;
            if (extension === 'msg') {
                msgInfo = window.extractMsg(fileBuffer);
            } else if (extension === 'eml') {
                msgInfo = window.extractEml(fileBuffer);
            }
            
            const message = this.messageHandler.addMessage(msgInfo, file.name);
            
            // Hide welcome screen and show app
            this.uiManager.showAppContainer();

            // Update message list
            this.uiManager.updateMessageList();
            
            // Show first message if it's the only one
            if (this.messageHandler.getMessages().length === 1) {
                this.uiManager.showMessage(message);
            }
        };
        reader.readAsArrayBuffer(file);
    }
}

module.exports = FileHandler; 