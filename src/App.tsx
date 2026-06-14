import { FormEvent, useMemo, useState } from "react";

type JobPosting = {
  id: number;
  title: string;
  company: string;
  platform: "LinkedIn" | "Indeed" | "Glassdoor" | "Wellfound";
  country: "United States" | "Canada" | "United Kingdom" | "Germany" | "India";
  location: string;
  salary: string;
  posted: string;
  summary: string;
  tags: string[];
};

const MOCK_JOBS: JobPosting[] = [
  {
    id: 1,
    title: "Frontend Engineer",
    company: "NovaTech",
    platform: "LinkedIn",
    country: "United States",
    location: "Remote",
    salary: "$115k - $145k",
    posted: "2 days ago",
    summary: "Build and optimize customer-facing React interfaces for a fast-growing SaaS product.",
    tags: ["React", "TypeScript", "Design Systems"]
  },
  {
    id: 2,
    title: "Product Designer",
    company: "PixelBloom",
    platform: "Indeed",
    country: "Canada",
    location: "Toronto, ON",
    salary: "CA$90k - CA$120k",
    posted: "1 day ago",
    summary: "Design user journeys and collaborate with PM and engineering to improve onboarding flows.",
    tags: ["Figma", "UX Research", "Prototyping"]
  },
  {
    id: 3,
    title: "Backend Developer",
    company: "CloudLoom",
    platform: "Glassdoor",
    country: "Germany",
    location: "Berlin",
    salary: "EUR 75k - EUR 95k",
    posted: "4 days ago",
    summary: "Develop microservices and APIs to support high-volume B2B workloads.",
    tags: ["Node.js", "PostgreSQL", "Docker"]
  },
  {
    id: 4,
    title: "Data Analyst",
    company: "BrightPath",
    platform: "LinkedIn",
    country: "United Kingdom",
    location: "London",
    salary: "GBP 45k - GBP 60k",
    posted: "5 days ago",
    summary: "Turn product and marketing data into insights that inform roadmap decisions.",
    tags: ["SQL", "Tableau", "Python"]
  },
  {
    id: 5,
    title: "Mobile App Developer",
    company: "OrbitPay",
    platform: "Wellfound",
    country: "India",
    location: "Bengaluru",
    salary: "INR 18L - INR 28L",
    posted: "3 days ago",
    summary: "Create mobile payment experiences with smooth performance and strong reliability.",
    tags: ["React Native", "TypeScript", "Testing"]
  },
  {
    id: 6,
    title: "DevOps Engineer",
    company: "KiteOps",
    platform: "Indeed",
    country: "United States",
    location: "Austin, TX",
    salary: "$125k - $160k",
    posted: "1 week ago",
    summary: "Own CI/CD infrastructure and cloud observability to improve release speed.",
    tags: ["AWS", "Kubernetes", "Terraform"]
  },
  {
    id: 7,
    title: "QA Automation Engineer",
    company: "ScaleBridge",
    platform: "Glassdoor",
    country: "Canada",
    location: "Vancouver, BC",
    salary: "CA$92k - CA$110k",
    posted: "6 days ago",
    summary: "Build reliable automated test suites and improve software quality metrics.",
    tags: ["Cypress", "API Testing", "CI"]
  },
  {
    id: 8,
    title: "Machine Learning Engineer",
    company: "SynthMind",
    platform: "LinkedIn",
    country: "Germany",
    location: "Munich",
    salary: "EUR 90k - EUR 120k",
    posted: "2 weeks ago",
    summary: "Deploy ML models to production and collaborate on model monitoring strategy.",
    tags: ["Python", "MLOps", "TensorFlow"]
  },
  {
    id: 9,
    title: "Customer Success Manager",
    company: "FlowHQ",
    platform: "Wellfound",
    country: "United Kingdom",
    location: "Remote",
    salary: "GBP 55k - GBP 70k",
    posted: "2 days ago",
    summary: "Guide enterprise customers through adoption and long-term platform value.",
    tags: ["SaaS", "B2B", "Onboarding"]
  },
  {
    id: 10,
    title: "Full Stack Engineer",
    company: "Lattice Labs",
    platform: "Indeed",
    country: "India",
    location: "Hyderabad",
    salary: "INR 24L - INR 32L",
    posted: "1 day ago",
    summary: "Work across UI and backend services to deliver end-to-end product features.",
    tags: ["React", "Node.js", "PostgreSQL"]
  },
  {
    id: 11,
    title: "Technical Writer",
    company: "DocuCore",
    platform: "Glassdoor",
    country: "United States",
    location: "Remote",
    salary: "$70k - $95k",
    posted: "3 days ago",
    summary: "Write product documentation and developer guides for API-first products.",
    tags: ["Documentation", "APIs", "Developer Experience"]
  },
  {
    id: 12,
    title: "Marketing Operations Specialist",
    company: "LaunchHarbor",
    platform: "LinkedIn",
    country: "Canada",
    location: "Montreal, QC",
    salary: "CA$78k - CA$96k",
    posted: "4 days ago",
    summary: "Optimize campaign workflows and improve lead pipeline tracking.",
    tags: ["CRM", "Analytics", "Automation"]
  }
];

const JOB_COUNT_OPTIONS = [5, 10, 20];
const ALL_FILTER_VALUE = "All";

function App() {
  const [platform, setPlatform] = useState<string>(ALL_FILTER_VALUE);
  const [country, setCountry] = useState<string>(ALL_FILTER_VALUE);
  const [jobCount, setJobCount] = useState<number>(10);
  const [prompt, setPrompt] = useState<string>("");
  const [results, setResults] = useState<JobPosting[]>(MOCK_JOBS.slice(0, 10));

  const platforms = useMemo(
    () => [ALL_FILTER_VALUE, ...new Set(MOCK_JOBS.map((job) => job.platform))],
    []
  );
  const countries = useMemo(
    () => [ALL_FILTER_VALUE, ...new Set(MOCK_JOBS.map((job) => job.country))],
    []
  );

  const runSearch = (event: FormEvent) => {
    event.preventDefault();

    const keyword = prompt.trim().toLowerCase();

    const filtered = MOCK_JOBS.filter((job) => {
      const platformMatch = platform === ALL_FILTER_VALUE || job.platform === platform;
      const countryMatch = country === ALL_FILTER_VALUE || job.country === country;
      const promptMatch =
        keyword.length === 0 ||
        [job.title, job.company, job.summary, job.tags.join(" ")]
          .join(" ")
          .toLowerCase()
          .includes(keyword);

      return platformMatch && countryMatch && promptMatch;
    });

    setResults(filtered.slice(0, jobCount));
  };

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

          <label className="field">
            <span>Prompt</span>
            <textarea
              value={prompt}
              onChange={(event) => setPrompt(event.target.value)}
              rows={4}
              placeholder="Example: Remote React role with design system experience"
            />
          </label>

          <button type="submit" className="search-button">
            Search jobs
          </button>
        </form>

        <section className="results">
          <div className="results-header">
            <h2>Results</h2>
            <p>{results.length} jobs found</p>
          </div>

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
                <p className="summary">{job.summary}</p>
                <ul className="tag-list">
                  {job.tags.map((tag) => (
                    <li key={`${job.id}-${tag}`}>{tag}</li>
                  ))}
                </ul>
              </article>
            ))}
          </div>

          {results.length === 0 && (
            <p className="empty-state">
              No mock jobs match your filters. Try choosing another platform, country, or prompt.
            </p>
          )}
        </section>
      </section>
    </main>
  );
}

export default App;
