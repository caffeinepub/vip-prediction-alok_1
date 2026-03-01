import Map "mo:core/Map";
import Time "mo:core/Time";
import Principal "mo:core/Principal";
import Text "mo:core/Text";
import Runtime "mo:core/Runtime";

actor {
  let periodLengthSeconds : Int = 60;
  let password = "SURESHOTALOK";
  let sessionExpiryNs : Int = 5 * 24 * 60 * 60 * 1000 * 1000 * 1000; // 5 days in nanoseconds

  let sessions = Map.empty<Principal, Int>();

  type PeriodInfo = {
    periodNumber : Int;
    secondsRemaining : Nat;
  };

  type Prediction = {
    periodNumber : Int;
    result : Text;
  };

  public shared ({ caller }) func authenticate(inputPassword : Text) : async () {
    if (inputPassword != password) { Runtime.trap("Invalid password") };
    sessions.add(caller, Time.now() + sessionExpiryNs);
  };

  public shared ({ caller }) func validateSession() : async () {
    switch (sessions.get(caller)) {
      case (null) { Runtime.trap("Session not found") };
      case (?expiry) {
        if (Time.now() > expiry) {
          sessions.remove(caller);
          Runtime.trap("Session expired");
        };
      };
    };
  };

  public query ({ caller }) func getCurrentPeriodInfo() : async PeriodInfo {
    let timestamp = Time.now() / 1_000_000_000; // Convert to seconds
    let periodNumber = timestamp / periodLengthSeconds;
    let secondsRemaining = (periodLengthSeconds - (timestamp % periodLengthSeconds).toNat()).toNat();
    {
      periodNumber;
      secondsRemaining;
    };
  };

  public query ({ caller }) func getPrediction(periodNumber : Int) : async Prediction {
    {
      periodNumber;
      result = if (periodNumber % 2 == 0) { "BIG" } else { "SMALL" };
    };
  };
};
