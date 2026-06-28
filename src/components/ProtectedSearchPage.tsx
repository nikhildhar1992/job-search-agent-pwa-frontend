import { useEffect } from "react";
import { PasswordGate } from "./PasswordGate";
import { useSearchAccess } from "../hooks/useSearchAccess";
import JobSearchPage from "../pages/JobSearchPage";

export function ProtectedSearchPage() {
  const { isGranted, grantAccess, revokeAccess } = useSearchAccess();

  useEffect(() => {
    sessionStorage.removeItem("job_search_access_granted");

    return () => {
      revokeAccess();
    };
  }, [revokeAccess]);

  if (!isGranted) {
    return <PasswordGate onSuccess={grantAccess} />;
  }

  return <JobSearchPage />;
}
