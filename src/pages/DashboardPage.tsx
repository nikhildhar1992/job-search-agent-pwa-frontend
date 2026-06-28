type DemoVideo = {
  id: string;
  title: string;
  description: string;
  videoUrl: string;
};

const DEMO_VIDEOS: DemoVideo[] = [
  {
    id: "voice-search",
    title: "Voice search demo",
    description: "See how to record a prompt and let the app detect platform and role.",
    videoUrl: "",
  },
  {
    id: "job-search",
    title: "Job search demo",
    description: "Walk through filters, prompts, and how ranked results are shown.",
    videoUrl: "",
  },
];

function DashboardPage() {
  return (
    <main className="app-shell">
      <section className="content">
        <header className="hero">
          <p className="eyebrow">Demo dashboard</p>
          <h1>See how the app works</h1>
          <p className="hero-copy">
            Watch feature walkthrough videos here. Add your video links in the dashboard config
            when they are ready.
          </p>
        </header>

        <section className="demo-grid">
          {DEMO_VIDEOS.map((video) => (
            <article className="demo-card" key={video.id}>
              <h2>{video.title}</h2>
              <p className="demo-card-copy">{video.description}</p>

              {video.videoUrl ? (
                <div className="demo-video-frame">
                  <iframe
                    src={video.videoUrl}
                    title={video.title}
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                  />
                </div>
              ) : (
                <div className="demo-video-placeholder">
                  <p>Video coming soon</p>
                  <span>Add a YouTube or Vimeo embed URL in DashboardPage.tsx</span>
                </div>
              )}
            </article>
          ))}
        </section>
      </section>
    </main>
  );
}

export default DashboardPage;
