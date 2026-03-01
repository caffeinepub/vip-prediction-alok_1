import { useMutation, useQuery } from "@tanstack/react-query";
import type { PeriodInfo, Prediction } from "../backend.d";
import { useActor } from "./useActor";

// ─── Authenticate ───
export function useAuthenticate() {
  const { actor } = useActor();
  return useMutation({
    mutationFn: async (password: string) => {
      if (!actor) throw new Error("Actor not ready");
      await actor.authenticate(password);
    },
  });
}

// ─── Validate Session ───
export function useValidateSession() {
  const { actor, isFetching } = useActor();
  return useQuery({
    queryKey: ["validateSession"],
    queryFn: async () => {
      if (!actor) return null;
      await actor.validateSession();
      return true;
    },
    enabled: !!actor && !isFetching,
    retry: false,
    staleTime: 60_000,
  });
}

// ─── Current Period Info ───
export function useCurrentPeriodInfo() {
  const { actor, isFetching } = useActor();
  return useQuery<PeriodInfo>({
    queryKey: ["periodInfo"],
    queryFn: async () => {
      if (!actor)
        return { periodNumber: BigInt(0), secondsRemaining: BigInt(60) };
      return actor.getCurrentPeriodInfo();
    },
    enabled: !!actor && !isFetching,
    refetchInterval: 1000,
    staleTime: 0,
  });
}

// ─── Get Prediction ───
export function useGetPrediction(periodNumber: bigint | null) {
  const { actor, isFetching } = useActor();
  return useQuery<Prediction>({
    queryKey: ["prediction", periodNumber?.toString()],
    queryFn: async () => {
      if (!actor || periodNumber === null) {
        return { periodNumber: BigInt(0), result: "BIG" };
      }
      return actor.getPrediction(periodNumber);
    },
    enabled: !!actor && !isFetching && periodNumber !== null,
    staleTime: 55_000,
  });
}
