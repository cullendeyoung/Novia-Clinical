import { useState, useRef, useCallback } from "react";

export interface RecordingState {
  isRecording: boolean;
  isPaused: boolean;
  duration: number;
  error: string | null;
}

export interface UseAudioRecorderReturn {
  state: RecordingState;
  startRecording: () => Promise<void>;
  stopRecording: () => Promise<Blob | null>;
  pauseRecording: () => void;
  resumeRecording: () => void;
  cancelRecording: () => void;
}

export function useAudioRecorder(): UseAudioRecorderReturn {
  const [state, setState] = useState<RecordingState>({
    isRecording: false,
    isPaused: false,
    duration: 0,
    error: null,
  });

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const startTimeRef = useRef<number>(0);
  const pausedDurationRef = useRef<number>(0);

  const updateDuration = useCallback(() => {
    if (startTimeRef.current && !state.isPaused) {
      const elapsed = Math.floor((Date.now() - startTimeRef.current) / 1000) - pausedDurationRef.current;
      setState((prev) => ({ ...prev, duration: elapsed }));
    }
  }, [state.isPaused]);

  const startRecording = useCallback(async () => {
    // Reset state
    chunksRef.current = [];
    pausedDurationRef.current = 0;

    // Check if getUserMedia is available
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      const errorMessage = "Audio recording is not supported in this browser.";
      setState((prev) => ({
        ...prev,
        isRecording: false,
        error: errorMessage,
      }));
      throw new Error(errorMessage);
    }

    try {
      // Request microphone access
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });

      streamRef.current = stream;

      // Create MediaRecorder with supported MIME type
      const mimeType = MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
        ? "audio/webm;codecs=opus"
        : MediaRecorder.isTypeSupported("audio/webm")
          ? "audio/webm"
          : "audio/mp4";

      const mediaRecorder = new MediaRecorder(stream, {
        mimeType,
        audioBitsPerSecond: 128000,
      });

      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onerror = (event) => {
        console.error("MediaRecorder error:", event);
        setState((prev) => ({
          ...prev,
          isRecording: false,
          error: "Recording error occurred",
        }));
      };

      // Start recording
      mediaRecorder.start(1000); // Collect data every second
      startTimeRef.current = Date.now();

      // Start duration timer
      timerRef.current = setInterval(updateDuration, 1000);

      setState({
        isRecording: true,
        isPaused: false,
        duration: 0,
        error: null,
      });
    } catch (error) {
      console.error("Failed to start recording:", error);
      const errorMessage =
        error instanceof DOMException && error.name === "NotAllowedError"
          ? "Microphone access denied. Please allow microphone access to record."
          : error instanceof DOMException && error.name === "NotFoundError"
            ? "No microphone found. Please connect a microphone."
            : "Failed to start recording. Please check your microphone.";

      setState((prev) => ({
        ...prev,
        isRecording: false,
        error: errorMessage,
      }));

      // Re-throw so the caller can handle it
      throw new Error(errorMessage);
    }
  }, [updateDuration]);

  const stopRecording = useCallback(async (): Promise<Blob | null> => {
    return new Promise((resolve) => {
      const mediaRecorder = mediaRecorderRef.current;

      if (!mediaRecorder || mediaRecorder.state === "inactive") {
        resolve(null);
        return;
      }

      // Clear the timer
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }

      mediaRecorder.onstop = () => {
        // Stop all tracks
        streamRef.current?.getTracks().forEach((track) => track.stop());
        streamRef.current = null;

        // Create blob from chunks
        const blob = new Blob(chunksRef.current, {
          type: mediaRecorder.mimeType,
        });

        setState({
          isRecording: false,
          isPaused: false,
          duration: 0,
          error: null,
        });

        resolve(blob);
      };

      mediaRecorder.stop();
    });
  }, []);

  const pauseRecording = useCallback(() => {
    const mediaRecorder = mediaRecorderRef.current;
    if (mediaRecorder && mediaRecorder.state === "recording") {
      mediaRecorder.pause();
      setState((prev) => ({ ...prev, isPaused: true }));
    }
  }, []);

  const resumeRecording = useCallback(() => {
    const mediaRecorder = mediaRecorderRef.current;
    if (mediaRecorder && mediaRecorder.state === "paused") {
      mediaRecorder.resume();
      setState((prev) => ({ ...prev, isPaused: false }));
    }
  }, []);

  const cancelRecording = useCallback(() => {
    // Clear the timer
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }

    // Stop media recorder without collecting data
    const mediaRecorder = mediaRecorderRef.current;
    if (mediaRecorder && mediaRecorder.state !== "inactive") {
      mediaRecorder.onstop = null;
      mediaRecorder.stop();
    }

    // Stop all tracks
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;

    // Reset chunks
    chunksRef.current = [];

    setState({
      isRecording: false,
      isPaused: false,
      duration: 0,
      error: null,
    });
  }, []);

  return {
    state,
    startRecording,
    stopRecording,
    pauseRecording,
    resumeRecording,
    cancelRecording,
  };
}

// Helper to format duration as MM:SS
export function formatDuration(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
}
