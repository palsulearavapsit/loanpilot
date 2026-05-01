import { pipeline, env } from 'https://cdn.jsdelivr.net/npm/@xenova/transformers@2.17.2';

// Skip local model check
env.allowLocalModels = false;

class WhisperWorker {
    static instance = null;
    static pipeline = null;

    static async getInstance(progress_callback = null) {
        if (this.instance === null) {
            this.pipeline = await pipeline('automatic-speech-recognition', 'Xenova/whisper-tiny.en', { progress_callback });
            this.instance = this;
        }
        return this.pipeline;
    }
}

self.onmessage = async (event) => {
    const { audio, language } = event.data;

    try {
        const transcriber = await WhisperWorker.getInstance((data) => {
            self.postMessage({ status: 'progress', data });
        });

        const output = await transcriber(audio, {
            chunk_length_s: 30,
            stride_length_s: 5,
            language: language === 'hi' ? 'hindi' : 'english',
            task: 'transcribe',
        });

        self.postMessage({ status: 'complete', data: output });
    } catch (error) {
        self.postMessage({ status: 'error', data: error.message });
    }
};
