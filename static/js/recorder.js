class AudioRecorder {
    constructor() {
        // Core properties
        this.mediaRecorder = null;
        this.audioChunks = [];
        this.isRecording = false;
        this.permissionGranted = false;
        this.retryAttempts = 0;
        this.maxRetryAttempts = 3;
        this.connectionMonitorInterval = null;
        this.streamRetryTimeout = null;
        
        // Browser detection
        this.browserInfo = this.detectBrowser();
        
        // Store supported features
        this.supportedFeatures = {
            mediaRecorder: 'MediaRecorder' in window,
            audioContext: 'AudioContext' in window || 'webkitAudioContext' in window,
            getUserMedia: navigator.mediaDevices && 'getUserMedia' in navigator.mediaDevices
        };
        
        // DOM elements
        this.recordButton = document.getElementById('recordButton');
        this.stopButton = document.getElementById('stopButton');
        this.statusIndicator = document.getElementById('statusIndicator');
        this.audioPlayer = document.getElementById('audioPlayer');
        this.audioContainer = document.getElementById('audioContainer');
        this.downloadButton = document.getElementById('downloadButton');
        this.permissionSection = document.getElementById('permissionSection');
        this.permissionButton = document.getElementById('permissionButton');
        this.browserInstructions = document.getElementById('browserInstructions');

        // Initialize recorder
        this.initializeRecorder();
    }

    async initializeRecorder() {
        // Check browser compatibility
        const compatibilityCheck = this.checkBrowserCompatibility();
        if (!compatibilityCheck.supported) {
            this.updateStatus(compatibilityCheck.message, 'error');
            return;
        }

        this.initializeEventListeners();
        await this.checkInitialPermissions();
        this.loadPersistedPermissionState();
    }

    detectBrowser() {
        const userAgent = navigator.userAgent.toLowerCase();
        let browser = {
            name: 'unknown',
            version: '0',
            isMobile: /mobile|android|ios|iphone|ipad|ipod/i.test(userAgent),
            isCompatible: true,
            incompatibleReason: ''
        };

        // Detect browser name and version
        if (userAgent.includes('chrome')) {
            browser.name = 'chrome';
            browser.version = userAgent.match(/chrome\/(\d+)/)?.[1] || '0';
            browser.isCompatible = parseInt(browser.version) >= 60;
        } else if (userAgent.includes('firefox')) {
            browser.name = 'firefox';
            browser.version = userAgent.match(/firefox\/(\d+)/)?.[1] || '0';
            browser.isCompatible = parseInt(browser.version) >= 70;
        } else if (userAgent.includes('safari') && !userAgent.includes('chrome')) {
            browser.name = 'safari';
            browser.version = userAgent.match(/version\/(\d+)/)?.[1] || '0';
            browser.isCompatible = parseInt(browser.version) >= 14;
        }

        return browser;
    }

    checkBrowserCompatibility() {
        // Check required features
        const missingFeatures = Object.entries(this.supportedFeatures)
            .filter(([, supported]) => !supported)
            .map(([feature]) => feature);

        if (missingFeatures.length > 0) {
            return {
                supported: false,
                message: `Your browser is missing required features: ${missingFeatures.join(', ')}. Please use a modern browser.`
            };
        }

        // Get supported MIME types based on browser
        this.supportedMimeTypes = this.getSupportedMimeTypes();
        
        if (this.supportedMimeTypes.length === 0) {
            return {
                supported: false,
                message: 'Your browser does not support any of the required audio formats.'
            };
        }

        return { supported: true, message: 'Browser compatibility check passed' };
    }

    getSupportedMimeTypes() {
        const defaultMimeTypes = {
            'chrome': ['audio/webm', 'audio/webm;codecs=opus'],
            'firefox': ['audio/ogg', 'audio/ogg;codecs=opus', 'audio/webm'],
            'safari': ['audio/mp4', 'audio/wav'],
            'default': ['audio/webm', 'audio/ogg', 'audio/wav', 'audio/mp4']
        };

        // Get browser-specific preferred MIME types
        const preferredTypes = defaultMimeTypes[this.browserInfo.name] || defaultMimeTypes.default;
        
        // Add all possible types as fallbacks
        const allTypes = [...new Set([
            ...preferredTypes,
            ...defaultMimeTypes.default
        ])];

        // Filter supported types
        const supported = allTypes.filter(mimeType => {
            try {
                return MediaRecorder.isTypeSupported(mimeType);
            } catch (e) {
                return false;
            }
        });

        if (supported.length > 0) {
            // Set primary MIME type based on browser preference
            this.primaryMimeType = supported.find(type => 
                preferredTypes.includes(type)
            ) || supported[0];
            
            console.log('Selected MIME type:', this.primaryMimeType);
            console.log('All supported types:', supported);
        } else {
            console.error('No supported MIME types found for', this.browserInfo.name);
        }

        return supported;
    }

    updateBrowserInstructions() {
        let instructions = '';
        
        // Add mobile-specific instructions
        if (this.browserInfo.isMobile) {
            instructions = `
                <ol class="text-start">
                    <li>Tap the three dots menu in your browser</li>
                    <li>Look for "Site Settings" or "Permissions"</li>
                    <li>Enable microphone access for this site</li>
                    <li>Refresh the page</li>
                </ol>`;
        } else {
            switch(this.browserInfo.name) {
                case 'chrome':
                    instructions = `
                        <ol class="text-start">
                            <li>Click the camera icon in the address bar</li>
                            <li>Select "Allow" for microphone access</li>
                            <li>Refresh the page</li>
                        </ol>`;
                    break;
                case 'firefox':
                    instructions = `
                        <ol class="text-start">
                            <li>Click the microphone icon in the address bar</li>
                            <li>Choose "Remember this decision"</li>
                            <li>Click "Allow"</li>
                        </ol>`;
                    break;
                case 'safari':
                    instructions = `
                        <ol class="text-start">
                            <li>Click Safari > Preferences > Websites</li>
                            <li>Find Microphone in the left sidebar</li>
                            <li>Allow access for this website</li>
                            <li>Refresh the page</li>
                        </ol>`;
                    break;
                default:
                    instructions = `
                        <ol class="text-start">
                            <li>Look for the microphone icon in your browser's address bar</li>
                            <li>Click it and select "Allow"</li>
                            <li>Refresh the page if needed</li>
                        </ol>`;
            }
        }
        
        this.browserInstructions.innerHTML = `
            <p class="mb-2"><strong>Browser-specific instructions:</strong></p>
            ${instructions}
            <p class="mt-3"><small>Supported formats: ${this.supportedMimeTypes.join(', ')}</small></p>`;
    }

    initializeEventListeners() {
        this.recordButton.addEventListener('click', () => this.startRecording());
        this.stopButton.addEventListener('click', () => this.stopRecording());
        this.downloadButton.addEventListener('click', () => this.downloadRecording());
        this.permissionButton.addEventListener('click', () => this.requestPermission());
        
        // Add audio player error handling
        this.audioPlayer.addEventListener('error', (e) => {
            console.error('Audio player error:', e);
            this.updateStatus('Error playing audio. Please try recording again.', 'error');
        });
    }

    async startRecording() {
        if (!this.permissionGranted) {
            await this.requestPermission();
            if (!this.permissionGranted) return;
        }

        try {
            const stream = await this.getAudioStream();
            
            if (!this.validateStream(stream)) {
                throw new Error('Invalid audio stream');
            }

            // Try creating MediaRecorder with primary format
            try {
                this.mediaRecorder = new MediaRecorder(stream, {
                    mimeType: this.primaryMimeType,
                    audioBitsPerSecond: 128000
                });
            } catch (error) {
                console.warn('Failed to create MediaRecorder with primary format:', error);
                // Try fallback format
                const fallbackFormat = this.supportedMimeTypes.find(type => type !== this.primaryMimeType);
                if (!fallbackFormat) {
                    throw new Error('No supported recording format available');
                }
                this.mediaRecorder = new MediaRecorder(stream, {
                    mimeType: fallbackFormat,
                    audioBitsPerSecond: 128000
                });
            }
            
            this.audioChunks = [];
            this.isRecording = true;
            
            this.mediaRecorder.ondataavailable = (event) => {
                if (event.data.size > 0) {
                    this.audioChunks.push(event.data);
                }
            };
            
            this.mediaRecorder.onstop = () => {
                this.processRecording();
            };
            
            this.mediaRecorder.start(1000);
            this.updateUI(true);
            this.startConnectionMonitoring();
            
        } catch (error) {
            this.handleRecordingError(error);
        }
    }

    stopRecording() {
        if (this.mediaRecorder && this.isRecording) {
            this.isRecording = false;
            this.mediaRecorder.stop();
            this.stopConnectionMonitoring();
            
            if (this.mediaRecorder.stream) {
                this.releaseStream(this.mediaRecorder.stream);
            }
            
            this.updateUI(false);
        }
    }

    processRecording() {
        if (this.audioChunks.length === 0) return;
        
        try {
            const audioBlob = new Blob(this.audioChunks, { type: this.primaryMimeType });
            const audioUrl = URL.createObjectURL(audioBlob);
            
            // Clean up old audio URL
            if (this.audioPlayer.dataset.oldUrl) {
                URL.revokeObjectURL(this.audioPlayer.dataset.oldUrl);
            }
            
            this.audioPlayer.src = audioUrl;
            this.audioPlayer.dataset.oldUrl = audioUrl;
            this.audioContainer.classList.remove('d-none');
            
        } catch (error) {
            console.error('Error processing recording:', error);
            this.updateStatus('Error processing recording. Please try again.', 'error');
        }
    }

    downloadRecording() {
        if (this.audioChunks.length === 0) return;
        
        try {
            const audioBlob = new Blob(this.audioChunks, { type: this.primaryMimeType });
            const url = URL.createObjectURL(audioBlob);
            const a = document.createElement('a');
            a.style.display = 'none';
            a.href = url;
            
            // Get file extension from MIME type
            const extension = this.primaryMimeType.split('/')[1].split(';')[0];
            a.download = `recording.${extension}`;
            
            document.body.appendChild(a);
            a.click();
            
            setTimeout(() => {
                document.body.removeChild(a);
                URL.revokeObjectURL(url);
            }, 100);
        } catch (error) {
            console.error('Error downloading recording:', error);
            this.updateStatus('Error downloading recording. Please try again.', 'error');
        }
    }

    updateUI(recording) {
        this.recordButton.disabled = recording;
        this.stopButton.disabled = !recording;
        this.statusIndicator.textContent = recording ? 'Recording...' : 'Ready to record';
        this.statusIndicator.className = `status-indicator ${recording ? 'recording' : ''}`;
    }

    updateStatus(message, type = 'info') {
        this.statusIndicator.textContent = message;
        this.statusIndicator.className = `status-indicator ${type}`;
    }

    // Helper methods from previous implementation...
    async checkInitialPermissions() {
        try {
            const permissionStatus = await navigator.permissions.query({ name: 'microphone' });
            
            permissionStatus.onchange = () => {
                this.handlePermissionChange(permissionStatus.state);
                this.persistPermissionState(permissionStatus.state);
            };

            await this.handlePermissionChange(permissionStatus.state);
            this.updateBrowserInstructions();
        } catch (error) {
            console.error('Error checking permissions:', error);
            this.showPermissionSection('error');
            this.updateStatus('Permission check failed. Please ensure your browser supports microphone access.', 'error');
        }
    }

    persistPermissionState(state) {
        try {
            localStorage.setItem('microphonePermission', state);
        } catch (e) {
            console.error('Error persisting permission state:', e);
        }
    }

    loadPersistedPermissionState() {
        try {
            const savedState = localStorage.getItem('microphonePermission');
            if (savedState) {
                this.handlePermissionChange(savedState);
            }
        } catch (e) {
            console.error('Error loading persisted permission state:', e);
        }
    }

    async handlePermissionChange(state) {
        switch (state) {
            case 'granted':
                this.permissionGranted = true;
                this.hidePermissionSection();
                this.recordButton.disabled = false;
                this.updateStatus('Ready to record', 'success');
                break;
            case 'denied':
                this.permissionGranted = false;
                this.showPermissionSection('error');
                this.updateStatus('Microphone access denied. Please grant permission to continue.', 'error');
                break;
            case 'prompt':
                this.permissionGranted = false;
                this.showPermissionSection('warning');
                this.updateStatus('Microphone permission required', 'warning');
                break;
        }
    }

    showPermissionSection(type = 'warning') {
        this.permissionSection.classList.remove('d-none');
        this.permissionSection.className = `permission-section ${type}`;
        this.recordButton.disabled = true;
    }

    hidePermissionSection() {
        this.permissionSection.classList.add('d-none');
        this.recordButton.disabled = false;
    }

    initializeEventListeners() {
        this.recordButton.addEventListener('click', () => this.startRecording());
        this.stopButton.addEventListener('click', () => this.stopRecording());
        this.downloadButton.addEventListener('click', () => this.downloadRecording());
        this.permissionButton.addEventListener('click', () => this.requestPermission());
        
        // Add audio player error handling
        this.audioPlayer.addEventListener('error', (e) => {
            console.error('Audio player error:', e);
            this.updateStatus('Error playing audio. Please try recording again.', 'error');
        });
    }

    startConnectionMonitoring() {
        this.stopConnectionMonitoring(); // Clear any existing interval
        
        this.connectionMonitorInterval = setInterval(() => {
            if (this.mediaRecorder && this.mediaRecorder.state === 'inactive' && this.isRecording) {
                console.error('Recording stopped unexpectedly');
                this.handleRecordingError(new Error('Recording stopped unexpectedly'));
            }
        }, 1000);
    }

    stopConnectionMonitoring() {
        if (this.connectionMonitorInterval) {
            clearInterval(this.connectionMonitorInterval);
            this.connectionMonitorInterval = null;
        }
    }

    async requestPermission() {
        try {
            const stream = await this.getAudioStream();
            
            // Test the stream and release it
            this.releaseStream(stream);
            
            this.permissionGranted = true;
            this.hidePermissionSection();
            this.updateStatus('Ready to record', 'success');
            
            // Reset retry attempts on successful permission
            this.retryAttempts = 0;
        } catch (error) {
            this.handlePermissionError(error);
        }
    }

    async getAudioStream(retryCount = 0) {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ 
                audio: {
                    echoCancellation: true,
                    noiseSuppression: true,
                    sampleRate: 44100
                }
            });

            if (!this.validateStream(stream)) {
                throw new Error('Invalid audio stream');
            }

            return stream;
        } catch (error) {
            if (retryCount < this.maxRetryAttempts) {
                console.log(`Retrying stream acquisition (${retryCount + 1}/${this.maxRetryAttempts})`);
                await new Promise(resolve => setTimeout(resolve, 1000));
                return this.getAudioStream(retryCount + 1);
            }
            throw error;
        }
    }

    validateStream(stream) {
        if (!stream || !stream.active) return false;
        
        const audioTracks = stream.getAudioTracks();
        if (audioTracks.length === 0) return false;
        
        const track = audioTracks[0];
        return track.enabled && track.readyState === 'live';
    }

    releaseStream(stream) {
        if (stream && stream.active) {
            stream.getTracks().forEach(track => track.stop());
        }
    }

    handlePermissionError(error) {
        console.error('Permission error:', error);
        this.retryAttempts++;
        
        let errorMessage = 'Could not access microphone. ';
        
        if (error.name === 'NotAllowedError') {
            errorMessage = 'Microphone access was denied. ';
        } else if (error.name === 'NotFoundError') {
            errorMessage = 'No microphone found. Please connect a microphone and try again. ';
        } else if (error.name === 'NotReadableError') {
            errorMessage = 'Microphone is in use by another application. ';
        }
        
        if (this.retryAttempts < this.maxRetryAttempts) {
            this.updateStatus(
                `${errorMessage} Retrying... (Attempt ${this.retryAttempts}/${this.maxRetryAttempts})`,
                'warning'
            );
            this.showPermissionSection('warning');
            
            // Set up automatic retry
            if (this.streamRetryTimeout) clearTimeout(this.streamRetryTimeout);
            this.streamRetryTimeout = setTimeout(() => this.requestPermission(), 2000);
        } else {
            this.updateStatus(
                `${errorMessage} Please check your browser settings and reload the page.`,
                'error'
            );
            this.showPermissionSection('error');
        }
    }

    handleRecordingError(error) {
        console.error('Recording error:', error);
        this.stopRecording();
        this.updateStatus('Recording failed. Please try again.', 'error');
        
        // Clean up any existing streams
        if (this.mediaRecorder && this.mediaRecorder.stream) {
            this.releaseStream(this.mediaRecorder.stream);
        }
    }

    async startRecording() {
        const compatibilityCheck = this.checkBrowserCompatibility();
        if (!compatibilityCheck.supported) {
            this.updateStatus(compatibilityCheck.message, 'error');
            return;
        }

        if (!this.permissionGranted) {
            await this.requestPermission();
            if (!this.permissionGranted) return;
        }

        try {
            const stream = await this.getAudioStream();
            
            if (!this.validateStream(stream)) {
                throw new Error('Invalid audio stream');
            }

            // Try creating MediaRecorder with primary format first
            try {
                this.mediaRecorder = new MediaRecorder(stream, {
                    mimeType: this.primaryMimeType
                });
            } catch (error) {
                // If primary format fails, try fallbacks
                const fallbackFormat = this.supportedMimeTypes.find(
                    format => format !== this.primaryMimeType
                );
                if (!fallbackFormat) {
                    throw new Error('No supported recording format available');
                }
                this.mediaRecorder = new MediaRecorder(stream, {
                    mimeType: fallbackFormat
                });
                console.log(`Falling back to ${fallbackFormat} format`);
            }
            
            this.audioChunks = [];
            
            this.mediaRecorder.ondataavailable = (event) => {
                if (event.data.size > 0) {
                    this.audioChunks.push(event.data);
                }
            };

            this.mediaRecorder.onstop = () => {
                this.stopConnectionMonitoring();
                this.processRecording();
            };

            this.mediaRecorder.onerror = (error) => {
                console.error('MediaRecorder error:', error);
                this.handleRecordingError(error);
            };

            this.mediaRecorder.start(100);
            this.isRecording = true;
            this.updateUI(true);
            this.startConnectionMonitoring();
            
        } catch (error) {
            console.error('Error starting recording:', error);
            this.handleRecordingError(error);
        }
    }

    processRecording() {
        try {
            const mimeType = this.mediaRecorder?.mimeType || this.primaryMimeType;
            const audioBlob = new Blob(this.audioChunks, { type: mimeType });
            
            // Clean up old audio URL before setting new one
            if (this.audioPlayer.dataset.oldUrl) {
                URL.revokeObjectURL(this.audioPlayer.dataset.oldUrl);
            }
            
            const audioUrl = URL.createObjectURL(audioBlob);
            this.audioPlayer.src = audioUrl;
            this.audioPlayer.dataset.oldUrl = audioUrl;
            this.audioContainer.classList.remove('d-none');
        } catch (error) {
            console.error('Error processing recording:', error);
            this.updateStatus('Error processing recording. Please try again.', 'error');
        }
    }

    stopRecording() {
        if (this.mediaRecorder && this.isRecording) {
            try {
                this.mediaRecorder.stop();
                this.isRecording = false;
                this.updateUI(false);
                
                this.releaseStream(this.mediaRecorder.stream);
            } catch (error) {
                console.error('Error stopping recording:', error);
                this.handleRecordingError(error);
            }
        }
    }

    downloadRecording() {
        if (this.audioChunks.length === 0) return;
        
        try {
            const mimeType = this.mediaRecorder?.mimeType || this.primaryMimeType;
            const audioBlob = new Blob(this.audioChunks, { type: mimeType });
            const url = URL.createObjectURL(audioBlob);
            const a = document.createElement('a');
            a.style.display = 'none';
            a.href = url;
            
            // Get the appropriate file extension
            let extension = mimeType.split('/')[1].split(';')[0];
            if (extension === 'webm' && !this.browserInfo.name.includes('chrome')) {
                extension = 'wav'; // Fallback for non-Chrome browsers
            }
            
            a.download = `recording.${extension}`;
            
            document.body.appendChild(a);
            a.click();
            
            setTimeout(() => {
                document.body.removeChild(a);
                URL.revokeObjectURL(url);
            }, 100);
        } catch (error) {
            console.error('Error downloading recording:', error);
            this.updateStatus('Error downloading recording. Please try again.', 'error');
        }
    }

    updateUI(recording) {
        this.recordButton.disabled = recording;
        this.stopButton.disabled = !recording;
        this.updateStatus(
            recording ? 'Recording in progress...' : 'Recording stopped',
            recording ? 'recording' : 'success'
        );
    }

    updateStatus(message, type) {
        this.statusIndicator.textContent = message;
        this.statusIndicator.className = 'status-indicator mb-4';
        
        switch (type) {
            case 'error':
                this.statusIndicator.style.color = 'var(--bs-danger)';
                break;
            case 'warning':
                this.statusIndicator.style.color = 'var(--bs-warning)';
                break;
            case 'success':
                this.statusIndicator.style.color = 'var(--bs-success)';
                break;
            case 'recording':
                this.statusIndicator.classList.add('recording');
                break;
            default:
                this.statusIndicator.style.color = 'var(--bs-secondary)';
        }
    }
}

// Initialize the recorder when the page loads
document.addEventListener('DOMContentLoaded', () => {
    new AudioRecorder();
});