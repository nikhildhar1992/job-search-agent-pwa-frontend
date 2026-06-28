export type AccessVerifyResponse = {
  success: true;
};

const API_BASE_URL = import.meta.env.VITE_API_URL ?? "";

export async function verifyAccessPassword(
  password: string,
  signal?: AbortSignal
): Promise<AccessVerifyResponse> {
  const response = await fetch(`${API_BASE_URL}/api/access/verify`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ password }),
    signal,
  });

  if (!response.ok) {
    let message = "Incorrect password. Please try again.";
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

  return (await response.json()) as AccessVerifyResponse;
}
