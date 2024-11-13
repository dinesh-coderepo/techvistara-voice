# techvistara-voice

### More details : [Link](https://dineshblog.com/blog/Ai-Voice-Calling)


# Web Audio Recorder

A web-based audio recorder application built with Flask and Web Audio API that provides a simple and intuitive interface for recording, playing back, and downloading audio.

## Features

- 🎙️ Real-time audio recording using Web Audio API
- ⏯️ Audio playback functionality
- ⬇️ Download recordings in multiple formats (WebM, WAV, MP4)
- 🎨 Responsive dark-themed UI with gradient background
- 💫 Smooth animations and visual feedback
- 🔄 Automatic format fallback for broader browser support
- 🔒 Secure permission handling

## Browser Compatibility Matrix

| Browser | Version | WebM | WAV | MP4 | Permission Handling |
|---------|---------|------|-----|-----|-------------------|
| Chrome  | ≥ 60    | ✅    | ✅   | ✅   | System Dialog     |
| Firefox | ≥ 70    | ✅    | ✅   | ❌   | Browser Prompt   |
| Safari  | ≥ 14    | ❌    | ✅   | ✅   | System Settings  |
| Edge    | ≥ 79    | ✅    | ✅   | ✅   | System Dialog     |
| Mobile Chrome | ≥ 60 | ✅ | ✅   | ✅   | Site Settings    |
| Mobile Safari | ≥ 14| ❌ | ✅   | ✅   | System Settings  |

## Prerequisites

- Python 3.x
- Modern web browser with microphone access
- For development: Replit environment

## Installation

1. Fork the project on Replit
2. The development server will start automatically
3. Access the application through the provided URL

## Development Environment Setup

1. Fork the Repository on Replit
```bash
# The environment will be automatically set up
```

2. Verify Dependencies
- Flask is automatically installed
- No additional dependencies required

3. Start Development Server
```bash
python main.py
```

## Troubleshooting Guide

### Audio Recording Issues

1. **No Microphone Access**
   - Check browser permissions
   - Follow browser-specific instructions
   - For Chrome: Click microphone icon in address bar
   - For Firefox: Check site permissions
   - For Safari: Check System Preferences > Security

2. **Recording Not Working**
   - Clear browser cache
   - Update browser to latest version
   - Check supported audio formats
   - Verify microphone is not in use by other applications

3. **Format Compatibility**
   - Chrome/Edge: Use WebM format
   - Safari: Use MP4/WAV format
   - Firefox: Use OGG/WebM format

4. **Playback Issues**
   - Verify audio output device
   - Check volume settings
   - Try different audio format
   - Clear browser cache

### Common Issues and Solutions

1. **Permission Denied**
   - Solution: Check browser settings
   - Chrome: chrome://settings/content/microphone
   - Firefox: about:preferences#privacy
   - Safari: System Preferences > Security > Privacy > Microphone

2. **Audio Not Recording**
   - Check microphone hardware
   - Verify browser compatibility
   - Clear site data and reload
   - Try different audio format

3. **Download Not Working**
   - Check browser download settings
   - Verify file format support
   - Clear browser cache
   - Try different format

## Testing Procedures

### 1. Permission Testing
- Grant microphone access
- Deny microphone access
- Revoke and re-grant permissions
- Test persistence across reloads

### 2. Recording Testing
- Short recordings (< 1 minute)
- Long recordings (> 5 minutes)
- Multiple consecutive recordings
- Recording during playback

### 3. Format Testing
- Test WebM recording
- Test WAV fallback
- Test MP4 support
- Verify playback

### 4. Error Testing
- Test permission denial
- Test format fallbacks
- Test connection loss
- Test invalid states

## Project Structure

```
├── main.py              # Flask application
├── static/
│   ├── css/
│   │   └── style.css   # Custom styles
│   ├── js/
│   │   └── recorder.js # Audio recording logic
│   └── icons/          # SVG icons
└── templates/
    └── index.html      # Main template
```

## Security Considerations

- Microphone access only when needed
- Client-side processing only
- No server storage of audio
- Secure permission handling
- Format validation

## Contributing

1. Fork on Replit
2. Create feature branch
3. Implement changes
4. Test thoroughly
5. Submit pull request

## License

MIT License

## Support

For issues and questions:
1. Check troubleshooting guide
2. Verify browser compatibility
3. Test in different browser
4. Clear site data and cache
5. Update browser if needed
