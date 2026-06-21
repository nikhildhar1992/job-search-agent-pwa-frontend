import { FormEvent, useEffect, useRef, useState } from "react";
import { searchJobs, type JobListing, type SearchCriteria } from "./api/jobSearch";
import { transcribeAudio } from "./api/transcribe";

const JOB_COUNT_OPTIONS = [5, 10, 20];
const ALL_FILTER_VALUE = "All";
const AUDIO_MIME_TYPE = "audio/webm";

const SEARCH_STAGES = [
  "Analyzing your prompt",
  "Running MCP server",
  "Calling Playwright to fetch jobs",
  "LLM processing results",
  "Ranking the best matches",
];
const SEARCH_STAGE_INTERVAL_MS = 1800;

const PLATFORM_OPTIONS = [ALL_FILTER_VALUE, "Naukri Gulf", "GulfTalent"];
const COUNTRY_OPTIONS = [
  ALL_FILTER_VALUE,
  "UAE",
  "Saudi Arabia",
  "Qatar",
  "Bahrain",
  "Kuwait",
];

type RecorderStatus = "idle" | "recording" | "stopping" | "stopped" | "error";

const formatDuration = (seconds: number): string => {
  const minutesPart = Math.floor(seconds / 60)
    .toString()
    .padStart(2, "0");
  const secondsPart = (seconds % 60).toString().padStart(2, "0");
  return `${minutesPart}:${secondsPart}`;
};

const resolveOption = (value: string, options: string[], fallback: string): string => {
  const normalized = value.trim().toLowerCase();
  if (normalized.length === 0) {
    return fallback;
  }

  const match = options.find((option) => option.toLowerCase() === normalized);
  return match ?? fallback;
};

const getMicrophoneErrorMessage = (error: unknown): string => {
  if (error instanceof DOMException) {
    if (error.name === "NotAllowedError" || error.name === "PermissionDeniedError") {
      return "Microphone access was denied. Please allow microphone permission and try again.";
    }

    if (error.name === "NotFoundError" || error.name === "DevicesNotFoundError") {
      return "No microphone device was found on this device.";
    }

    if (error.name === "NotReadableError" || error.name === "TrackStartError") {
      return "Microphone is busy or unavailable. Close other apps using it and retry.";
    }
  }

  return "Unable to access microphone right now. Please try again.";
};

function App() {
  const [platform, setPlatform] = useState<string>(ALL_FILTER_VALUE);
  const [country, setCountry] = useState<string>(ALL_FILTER_VALUE);
  const [jobCount, setJobCount] = useState<number>(10);
  const [prompt, setPrompt] = useState<string>("");
  const [results, setResults] = useState<JobListing[]>([]);
  const [searchCriteria, setSearchCriteria] = useState<SearchCriteria | null>(null);
  const [isSearching, setIsSearching] = useState<boolean>(false);
  const [hasSearched, setHasSearched] = useState<boolean>(false);
  const [searchStage, setSearchStage] = useState<number>(0);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [recorderStatus, setRecorderStatus] = useState<RecorderStatus>("idle");
  const [recordingDuration, setRecordingDuration] = useState<number>(0);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [microphoneError, setMicrophoneError] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [isTranscribing, setIsTranscribing] = useState<boolean>(false);
  const [transcript, setTranscript] = useState<string>("");
  const [detectedCountry, setDetectedCountry] = useState<string>("");
  const [detectedPlatform, setDetectedPlatform] = useState<string>("");
  const [transcriptionError, setTranscriptionError] = useState<string | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const microphoneStreamRef = useRef<MediaStream | null>(null);
  const recordingChunksRef = useRef<Blob[]>([]);
  const recordingStartTimeRef = useRef<number>(0);
  const durationTimerRef = useRef<number | null>(null);
  const autoSearchPendingRef = useRef<boolean>(false);

  const platforms = PLATFORM_OPTIONS;
  const countries = COUNTRY_OPTIONS;

  const stopMicrophoneStream = () => {
    const stream = microphoneStreamRef.current;
    if (!stream) {
      return;
    }

    stream.getTracks().forEach((track) => track.stop());
    microphoneStreamRef.current = null;
  };

  const clearDurationTimer = () => {
    if (durationTimerRef.current !== null) {
      window.clearInterval(durationTimerRef.current);
      durationTimerRef.current = null;
    }
  };

  const startRecording = async () => {
    if (recorderStatus === "recording") {
      return;
    }

    setMicrophoneError(null);

    if (!navigator.mediaDevices?.getUserMedia) {
      setRecorderStatus("error");
      setMicrophoneError("Microphone recording is not supported on this browser.");
      return;
    }

    if (typeof MediaRecorder === "undefined") {
      setRecorderStatus("error");
      setMicrophoneError("Audio recording is not supported on this browser.");
      return;
    }

    try {
      stopMicrophoneStream();

      recordingChunksRef.current = [];
      setAudioBlob(null);
      setRecordingDuration(0);

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      microphoneStreamRef.current = stream;

      const canUseOpus = MediaRecorder.isTypeSupported("audio/webm;codecs=opus");
      const canUseWebm = MediaRecorder.isTypeSupported(AUDIO_MIME_TYPE);
      const mimeType = canUseOpus ? "audio/webm;codecs=opus" : canUseWebm ? AUDIO_MIME_TYPE : "";

      const recorder = mimeType
        ? new MediaRecorder(stream, { mimeType })
        : new MediaRecorder(stream);

      mediaRecorderRef.current = recorder;

      recorder.ondataavailable = (event: BlobEvent) => {
        if (event.data.size > 0) {
          recordingChunksRef.current.push(event.data);
        }
      };

      recorder.onerror = () => {
        setRecorderStatus("error");
        setMicrophoneError("Recording failed unexpectedly. Please try again.");
        clearDurationTimer();
        stopMicrophoneStream();
        mediaRecorderRef.current = null;
      };

      recorder.onstop = () => {
        clearDurationTimer();
        stopMicrophoneStream();
        mediaRecorderRef.current = null;

        const durationSeconds = Math.max(
          0,
          Math.round((Date.now() - recordingStartTimeRef.current) / 1000)
        );
        setRecordingDuration(durationSeconds);

        const finalBlob = new Blob(recordingChunksRef.current, { type: AUDIO_MIME_TYPE });
        setAudioBlob(finalBlob);
        setRecorderStatus("stopped");
      };

      recorder.start(250);
      recordingStartTimeRef.current = Date.now();
      setRecorderStatus("recording");

      clearDurationTimer();
      durationTimerRef.current = window.setInterval(() => {
        const elapsedSeconds = Math.max(
          0,
          Math.floor((Date.now() - recordingStartTimeRef.current) / 1000)
        );
        setRecordingDuration(elapsedSeconds);
      }, 250);
    } catch (error) {
      setRecorderStatus("error");
      setMicrophoneError(getMicrophoneErrorMessage(error));
      stopMicrophoneStream();
      clearDurationTimer();
    }
  };

  const stopRecording = () => {
    const recorder = mediaRecorderRef.current;
    if (!recorder || recorder.state === "inactive") {
      return;
    }

    setRecorderStatus("stopping");
    recorder.stop();
  };

  useEffect(() => {
    if (!isSearching) {
      return;
    }

    setSearchStage(0);
    const intervalId = window.setInterval(() => {
      setSearchStage((previous) => Math.min(previous + 1, SEARCH_STAGES.length - 1));
    }, SEARCH_STAGE_INTERVAL_MS);

    return () => {
      window.clearInterval(intervalId);
    };
  }, [isSearching]);

  useEffect(() => {
    if (!audioBlob) {
      setAudioUrl(null);
      return;
    }

    const nextAudioUrl = URL.createObjectURL(audioBlob);
    setAudioUrl(nextAudioUrl);

    return () => {
      URL.revokeObjectURL(nextAudioUrl);
    };
  }, [audioBlob]);

  useEffect(() => {
    return () => {
      clearDurationTimer();

      const recorder = mediaRecorderRef.current;
      if (recorder) {
        recorder.ondataavailable = null;
        recorder.onerror = null;
        recorder.onstop = null;
        if (recorder.state !== "inactive") {
          recorder.stop();
        }
        mediaRecorderRef.current = null;
      }

      stopMicrophoneStream();
    };
  }, []);

  const runJobSearch = async (params: {
    platform: string;
    country: string;
    prompt: string;
    count: number;
  }) => {
    setIsSearching(true);
    setHasSearched(true);
    setSearchError(null);

    const trimmedPrompt = params.prompt.trim();

    try {
      const data = await searchJobs({
        platform: params.platform,
        country: params.country,
        count: params.count,
        ...(trimmedPrompt.length > 0 ? { prompt: trimmedPrompt } : {}),
      });
      setResults(data.jobs);
      setSearchCriteria(data.searchCriteria);
    } catch (error) {
      setSearchError(
        error instanceof Error ? error.message : "Something went wrong while fetching jobs."
      );
      setResults([]);
      setSearchCriteria(null);
    } finally {
      setIsSearching(false);
    }
  };

  const runSearch = (event: FormEvent) => {
    event.preventDefault();
    void runJobSearch({ platform, country, prompt, count: jobCount });
  };

  const transcribeAndSearch = async (blob: Blob) => {
    setIsTranscribing(true);
    setTranscriptionError(null);

    try {
      const data = await transcribeAudio(blob, "recording.webm");

      setTranscript(data.transcript);
      setDetectedCountry(data.country);
      setDetectedPlatform(data.platform);

      const resolvedCountry = resolveOption(data.country, COUNTRY_OPTIONS, country);
      const resolvedPlatform = resolveOption(data.platform, PLATFORM_OPTIONS, platform);

      setCountry(resolvedCountry);
      setPlatform(resolvedPlatform);
      setPrompt(data.transcript);

      setIsModalOpen(false);

      await runJobSearch({
        platform: resolvedPlatform,
        country: resolvedCountry,
        prompt: data.transcript,
        count: jobCount,
      });
    } catch (error) {
      setTranscriptionError(
        error instanceof Error ? error.message : "Could not transcribe the recording."
      );
    } finally {
      setIsTranscribing(false);
    }
  };

  const openRecorderModal = () => {
    setMicrophoneError(null);
    setTranscriptionError(null);
    setTranscript("");
    setDetectedCountry("");
    setDetectedPlatform("");
    setAudioBlob(null);
    setRecorderStatus("idle");
    setRecordingDuration(0);
    setIsModalOpen(true);
  };

  const closeRecorderModal = () => {
    const recorder = mediaRecorderRef.current;
    if (recorder && recorder.state !== "inactive") {
      autoSearchPendingRef.current = false;
      recorder.stop();
    }
    setIsModalOpen(false);
  };

  const stopRecordingForSearch = () => {
    autoSearchPendingRef.current = true;
    stopRecording();
  };

  useEffect(() => {
    if (audioBlob && autoSearchPendingRef.current) {
      autoSearchPendingRef.current = false;
      void transcribeAndSearch(audioBlob);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [audioBlob]);

  return (
    <main className="app-shell">
      <section className="content">
        <header className="hero">
          <p className="eyebrow">PWA Job Search</p>
          <h1>Find the right role fast</h1>
          <p className="hero-copy">
            Search mock job listings by platform and location, then refine results with a custom
            prompt.
          </p>
        </header>

        <form className="search-form" onSubmit={runSearch}>
          <div className="field-grid">
            <label className="field">
              <span>Platform</span>
              <select value={platform} onChange={(event) => setPlatform(event.target.value)}>
                {platforms.map((item) => (
                  <option key={item} value={item}>
                    {item}
                  </option>
                ))}
              </select>
            </label>

            <label className="field">
              <span>Country</span>
              <select value={country} onChange={(event) => setCountry(event.target.value)}>
                {countries.map((item) => (
                  <option key={item} value={item}>
                    {item}
                  </option>
                ))}
              </select>
            </label>

            <label className="field">
              <span>Job count</span>
              <select
                value={jobCount}
                onChange={(event) => setJobCount(Number(event.target.value))}
              >
                {JOB_COUNT_OPTIONS.map((count) => (
                  <option key={count} value={count}>
                    {count}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <div className="prompt-recorder-layout">
            <label className="field">
              <span>Prompt</span>
              <textarea
                value={prompt}
                onChange={(event) => setPrompt(event.target.value)}
                rows={4}
                placeholder="Example: Remote React role with design system experience"
              />
            </label>

            <section className="recorder-panel" aria-live="polite">
              <p className="recorder-title">Voice search</p>
              <p className="recorder-help">
                Speak your request and we will detect the country and platform, then search
                automatically.
              </p>
              <button
                type="button"
                className="voice-search-button"
                onClick={openRecorderModal}
                disabled={isTranscribing || isSearching}
              >
                <span className="voice-search-icon" aria-hidden="true">
                  🎤
                </span>
                {isTranscribing ? "Transcribing..." : "Start voice search"}
              </button>

              {transcriptionError && <p className="microphone-error">{transcriptionError}</p>}
            </section>
          </div>

          <section className="transcript-card">
            <h3>Transcript</h3>
            {transcript ? (
              <>
                <p className="transcript-text">{transcript}</p>
                <div className="transcript-tags">
                  <span className="transcript-tag">
                    Country: <strong>{detectedCountry || "Not detected"}</strong>
                  </span>
                  <span className="transcript-tag">
                    Platform: <strong>{detectedPlatform || "Not detected"}</strong>
                  </span>
                </div>
              </>
            ) : (
              <p className="transcript-empty">No transcript available yet</p>
            )}
          </section>

          <button type="submit" className="search-button" disabled={isSearching}>
            {isSearching ? "Searching..." : "Search jobs"}
          </button>

          {isSearching && (
            <section className="search-progress" aria-live="polite">
              <p className="search-progress-title">Working on your search</p>
              <ul className="search-stage-list">
                {SEARCH_STAGES.map((stage, index) => {
                  const status =
                    index < searchStage
                      ? "done"
                      : index === searchStage
                        ? "active"
                        : "pending";
                  return (
                    <li key={stage} className={`search-stage search-stage-${status}`}>
                      <span className="search-stage-icon" aria-hidden="true">
                        {status === "done" ? "✓" : status === "active" ? "" : ""}
                      </span>
                      <span className="search-stage-label">{stage}</span>
                    </li>
                  );
                })}
              </ul>
            </section>
          )}
        </form>

        {hasSearched && (
        <section className="results">
          <div className="results-header">
            <h2>Results</h2>
            <p>{isSearching ? "Searching..." : `${results.length} jobs found`}</p>
          </div>

          {searchError && <p className="search-error">{searchError}</p>}

          {searchCriteria && !searchError && (
            <div className="criteria-panel">
              <p className="criteria-title">Interpreted search criteria</p>
              <ul className="criteria-list">
                <li>
                  Role: <strong>{searchCriteria.role || "Any"}</strong>
                </li>
                <li>
                  Country: <strong>{searchCriteria.country || "Any"}</strong>
                </li>
                <li>
                  Remote: <strong>{searchCriteria.remote ? "Yes" : "No"}</strong>
                </li>
                <li>
                  Count: <strong>{searchCriteria.count}</strong>
                </li>
                <li>
                  Min salary:{" "}
                  <strong>
                    {searchCriteria.salaryMin === null ? "Any" : searchCriteria.salaryMin}
                  </strong>
                </li>
                {searchCriteria.skills.length > 0 && (
                  <li className="criteria-skills">
                    Skills:{" "}
                    {searchCriteria.skills.map((skill) => (
                      <span key={skill} className="criteria-skill">
                        {skill}
                      </span>
                    ))}
                  </li>
                )}
              </ul>
            </div>
          )}

          <div className="card-grid">
            {results.map((job) => (
              <article className="job-card" key={job.id}>
                <div className="card-header">
                  <h3>{job.title}</h3>
                  <span className="platform-pill">{job.platform}</span>
                </div>
                <p className="company">{job.company}</p>
                <p className="meta">
                  {job.location} - {job.country}
                </p>
                <p className="meta">
                  {job.salary} - Posted {job.posted}
                </p>
                <p className="meta">Match score: {job.matchScore}%</p>
                <p className="summary">{job.summary}</p>
                <ul className="tag-list">
                  {job.tags.map((tag) => (
                    <li key={`${job.id}-${tag}`}>{tag}</li>
                  ))}
                </ul>
                <a className="job-link" href={job.url} target="_blank" rel="noreferrer">
                  View job
                </a>
              </article>
            ))}
          </div>

          {!isSearching && !searchError && results.length === 0 && (
            <p className="empty-state">
              No jobs match your filters. Try choosing another platform, country, or prompt.
            </p>
          )}
        </section>
        )}
      </section>

      {isModalOpen && (
        <div
          className="modal-overlay"
          role="dialog"
          aria-modal="true"
          aria-label="Voice job search"
          onClick={closeRecorderModal}
        >
          <div className="modal-card" onClick={(event) => event.stopPropagation()}>
            <div className="modal-header">
              <h2>Voice job search</h2>
              <button
                type="button"
                className="modal-close"
                onClick={closeRecorderModal}
                aria-label="Close"
              >
                ×
              </button>
            </div>

            <div className="modal-instructions">
              <p className="modal-instructions-title">While recording, clearly mention:</p>
              <ul>
                <li>
                  The <strong>country</strong> — UAE, Saudi Arabia, Qatar, Bahrain, or Kuwait
                </li>
                <li>
                  The <strong>platform</strong> — Naukri Gulf or GulfTalent
                </li>
              </ul>
              <p className="modal-example">
                Example: “Find me Node.js developer jobs in UAE on GulfTalent.”
              </p>
            </div>

            <div className="modal-recorder">
              <button
                type="button"
                className={`mic-orb ${recorderStatus === "recording" ? "is-recording" : ""}`}
                onClick={
                  recorderStatus === "recording" ? stopRecordingForSearch : startRecording
                }
                disabled={recorderStatus === "stopping" || isTranscribing}
              >
                <span className="mic-orb-icon" aria-hidden="true">
                  {recorderStatus === "recording" ? "■" : "🎤"}
                </span>
              </button>

              <p className="modal-status">
                {isTranscribing
                  ? "Transcribing your recording..."
                  : recorderStatus === "recording"
                    ? "Listening... tap to stop"
                    : recorderStatus === "stopped"
                      ? "Recording captured"
                      : "Tap the mic to start"}
              </p>

              <p className="modal-duration">{formatDuration(recordingDuration)}</p>

              {recorderStatus === "recording" && (
                <p className="recording-indicator">
                  <span className="recording-dot" />
                  Recording in progress
                </p>
              )}

              {isTranscribing && (
                <div className="modal-spinner" aria-hidden="true">
                  <span className="spinner" />
                </div>
              )}

              {audioUrl && recorderStatus === "stopped" && !isTranscribing && (
                <audio controls className="audio-player" src={audioUrl}>
                  Your browser does not support audio playback.
                </audio>
              )}

              {microphoneError && <p className="microphone-error">{microphoneError}</p>}
              {transcriptionError && <p className="microphone-error">{transcriptionError}</p>}
            </div>
          </div>
        </div>
      )}
    </main>
  );
}

export default App;
