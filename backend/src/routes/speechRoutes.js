const express = require('express');
const { SpeechClient } = require('@google-cloud/speech');
const authenticateToken = require('../middleware/auth');
const ffmpeg = require('fluent-ffmpeg');
const ffmpegInstaller = require('@ffmpeg-installer/ffmpeg');
const { promisify } = require('util');
const fs = require('fs');
const path = require('path');
const os = require('os');

// Set ffmpeg path from the installer
ffmpeg.setFfmpegPath(ffmpegInstaller.path);

const router = express.Router();

// Check if Google Speech API key is configured
if (!process.env.GOOGLE_SPEECH_API_KEY) {
    console.error('WARNING: GOOGLE_SPEECH_API_KEY is not set in environment variables');
    console.error('Speech-to-text functionality will not work without a valid API key');
}

// Initialize SpeechClient with API key only
const speechClient = new SpeechClient({
    apiKey: process.env.GOOGLE_SPEECH_API_KEY
});

// Convert audio to raw PCM
const convertAudioToPCM = async (base64Audio) => {
    return new Promise(async (resolve, reject) => {
        try {
            // Create temporary files
            const tempDir = os.tmpdir();
            const inputFile = path.join(tempDir, `input-${Date.now()}.m4a`);
            const outputFile = path.join(tempDir, `output-${Date.now()}.raw`);

            // Write base64 audio to file
            const audioBuffer = Buffer.from(base64Audio, 'base64');
            await fs.promises.writeFile(inputFile, audioBuffer);

            console.log('Starting audio conversion with ffmpeg:', {
                inputFile,
                outputFile,
                ffmpegPath: ffmpegInstaller.path
            });

            // Convert to PCM using ffmpeg
            ffmpeg(inputFile)
                .toFormat('s16le') // 16-bit PCM
                .audioChannels(1) // Mono
                .audioFrequency(16000) // 16kHz
                .on('start', (commandLine) => {
                    console.log('FFmpeg command:', commandLine);
                })
                .on('progress', (progress) => {
                    console.log('Conversion progress:', progress);
                })
                .on('end', async () => {
                    try {
                        console.log('Audio conversion completed');
                        // Read the converted file
                        const pcmBuffer = await fs.promises.readFile(outputFile);
                        const pcmBase64 = pcmBuffer.toString('base64');

                        // Clean up temporary files
                        await fs.promises.unlink(inputFile);
                        await fs.promises.unlink(outputFile);

                        resolve(pcmBase64);
                    } catch (error) {
                        console.error('Error processing converted file:', error);
                        reject(error);
                    }
                })
                .on('error', (err) => {
                    console.error('FFmpeg error:', err);
                    reject(err);
                })
                .save(outputFile);
        } catch (error) {
            console.error('Error in convertAudioToPCM:', error);
            reject(error);
        }
    });
};

router.post('/speech-to-text', authenticateToken, async (req, res, next) => {
    try {
        console.log('Received speech-to-text request');
        const { audio, encoding, sampleRateHertz, languageCode } = req.body;

        if (!audio) {
            console.error('No audio data provided in request');
            return res.status(400).json({ 
                error: 'No audio data provided',
                details: 'The request body must include an audio field'
            });
        }

        console.log('Audio data received:', {
            audioLength: audio.length,
            encoding: encoding || 'LINEAR16',
            sampleRateHertz: sampleRateHertz || 16000,
            languageCode: languageCode || 'en-US',
            first100Chars: audio.substring(0, 100),
            last100Chars: audio.substring(audio.length - 100)
        });

        if (!process.env.GOOGLE_SPEECH_API_KEY) {
            console.error('Google Speech API key is not configured');
            return res.status(503).json({ 
                error: 'Speech recognition service is not properly configured',
                details: 'Please contact the administrator. The speech recognition service is currently unavailable.',
                code: 'SERVICE_UNAVAILABLE'
            });
        }

        // Convert audio to PCM
        console.log('Converting audio to PCM format...');
        const pcmAudio = await convertAudioToPCM(audio);
        console.log('Audio conversion complete. PCM data length:', pcmAudio.length);

        const request = {
            audio: {
                content: pcmAudio,
            },
            config: {
                encoding: 'LINEAR16',
                sampleRateHertz: 16000,
                languageCode: 'en-US',
                model: 'command_and_search',
                useEnhanced: true,
                audioChannelCount: 1,
                enableAutomaticPunctuation: true,
                maxAlternatives: 1,
                speechContexts: [{
                    phrases: [
                        'navigate to',
                        'find alternative route',
                        'report',
                        'check traffic',
                        'close road',
                        'open road'
                    ],
                    boost: 20
                }]
            },
        };

        console.log('Sending request to Google Speech-to-Text API with config:', {
            encoding: request.config.encoding,
            sampleRateHertz: request.config.sampleRateHertz,
            audioLength: pcmAudio.length,
            audioPreview: pcmAudio.substring(0, 50) + '...'
        });

        try {
            const [response] = await speechClient.recognize(request);
            console.log('Raw response from Google Speech-to-Text API:', JSON.stringify(response, null, 2));

            const transcription = response.results
                ?.map(result => result.alternatives?.[0]?.transcript)
                .join('\n');

            if (!transcription) {
                console.error('No transcription found in response');
                return res.status(400).json({ 
                    error: 'No speech detected',
                    details: 'The audio did not contain any recognizable speech. Please try speaking more clearly and closer to the microphone.'
                });
            }

            console.log('Successfully transcribed speech:', transcription);
            res.json({ transcript: transcription });
        } catch (apiError) {
            console.error('Google Speech-to-Text API error:', {
                name: apiError.name,
                message: apiError.message,
                code: apiError.code,
                details: apiError.details,
                status: apiError.status
            });
            
            res.status(500).json({ 
                error: 'Speech recognition failed',
                details: apiError.message || 'Unknown error occurred during speech recognition',
                code: apiError.code,
                status: apiError.status
            });
        }
    } catch (error) {
        console.error('Speech-to-text error details:', {
            name: error.name,
            message: error.message,
            code: error.code,
            stack: error.stack,
            type: typeof error
        });
        
        res.status(500).json({ 
            error: 'Failed to process speech',
            details: error.message || 'An unexpected error occurred',
            code: error.code
        });
    }
});

module.exports = router; 