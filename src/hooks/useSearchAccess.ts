import { useCallback, useState } from "react";

export function useSearchAccess() {
  const [isGranted, setIsGranted] = useState(false);

  const grantAccess = useCallback(() => {
    setIsGranted(true);
  }, []);

  const revokeAccess = useCallback(() => {
    setIsGranted(false);
  }, []);

  return { isGranted, grantAccess, revokeAccess };
}
