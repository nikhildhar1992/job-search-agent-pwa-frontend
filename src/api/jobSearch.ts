export type JobListing = {
  id: string;
  title: string;
  company: string;
  platform: string;
  country: string;
  location: string;
  salary: string;
  posted: string;
  summary: string;
  tags: string[];
  matchScore: number;
  url: string;
};

export type JobSearchRequest = {
  platform: string;
  country: string;
  count: number;
  prompt?: string;
  excludeSeen?: boolean;
};

export type SearchCriteria = {
  role: string;
  skills: string[];
  country: string;
  count: number;
  remote: boolean;
  salaryMin: number | null;
};

export type JobSearchResponse = {
  success: true;
  searchCriteria: SearchCriteria;
  jobs: JobListing[];
};

const API_BASE_URL = import.meta.env.VITE_API_URL ?? "";

export async function searchJobs(
  body: JobSearchRequest,
  signal?: AbortSignal
): Promise<JobSearchResponse> {
  const response = await fetch(`${API_BASE_URL}/api/job-search`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
    signal,
  });

  if (!response.ok) {
    let message = `Request failed with status ${response.status}`;
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

  return (await response.json()) as JobSearchResponse;
}
