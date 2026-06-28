export type TranscribeResponse = {
  success: true;
  transcript: string;
  country: string;
  platform: string;
};

const API_BASE_URL = import.meta.env.VITE_API_URL ?? "";

export async function transcribeAudio(
  audio: Blob,
  filename = "recording.webm",
  signal?: AbortSignal
): Promise<TranscribeResponse> {
  const formData = new FormData();
  formData.append("audio", audio, filename);

  const response = await fetch(`${API_BASE_URL}/api/transcribe`, {
    method: "POST",
    body: formData,
    signal,
  });

  if (!response.ok) {
    let message = `Transcription failed with status ${response.status}`;
    try {
      const errorBody = (await response.json()) as { message?: string };
      if (errorBody?.message) {
        message = errorBody.message;
      }
    } catch {
      // Ignore JSON parse errors and use the default message.
    }
    throw new Error(message);
  }

  return (await response.json()) as TranscribeResponse;
}
