import type { Principal } from "@icp-sdk/core/principal";
export interface Some<T> {
    __kind__: "Some";
    value: T;
}
export interface None {
    __kind__: "None";
}
export type Option<T> = Some<T> | None;
export interface PeriodInfo {
    secondsRemaining: bigint;
    periodNumber: bigint;
}
export interface VisitorStats {
    onlineNow: bigint;
    totalVisits: bigint;
}
export interface Prediction {
    result: string;
    periodNumber: bigint;
}
export interface backendInterface {
    authenticate(inputPassword: string): Promise<void>;
    getCurrentPeriodInfo(): Promise<PeriodInfo>;
    getPrediction(periodNumber: bigint): Promise<Prediction>;
    getVisitorStats(): Promise<VisitorStats>;
    heartbeat(): Promise<void>;
    validateSession(): Promise<void>;
}
