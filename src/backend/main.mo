import Map "mo:core/Map";
import Time "mo:core/Time";
import Principal "mo:core/Principal";
import Text "mo:core/Text";
import Runtime "mo:core/Runtime";
import Iter "mo:core/Iter";
import Nat "mo:core/Nat";
import Migration "migration";

(with migration = Migration.run)
actor {
  let periodLengthSeconds : Int = 60;
  let password = "SURESHOTALOK";
  let sessionExpiryNs : Int = 5 * 24 * 60 * 60 * 1000 * 1000 * 1000; // 5 days in nanoseconds
  let onlineWindowNs : Int = 5 * 60 * 1000 * 1000 * 1000; // 5 minutes in nanoseconds

  let sessions = Map.empty<Principal, Int>();
  let lastSeen = Map.empty<Principal, Int>();

  var totalVisits = 0;

  type PeriodInfo = {
    periodNumber : Int;
    secondsRemaining : Nat;
  };

  type Prediction = {
    periodNumber : Int;
    result : Text;
  };

  type VisitorStats = {
    totalVisits : Nat;
    onlineNow : Nat;
  };

  public shared ({ caller }) func authenticate(inputPassword : Text) : async () {
    if (inputPassword != password) { Runtime.trap("Invalid password") };
    sessions.add(caller, Time.now() + sessionExpiryNs);
    lastSeen.add(caller, Time.now());
    totalVisits += 1;
  };

  public shared ({ caller }) func validateSession() : async () {
    switch (sessions.get(caller)) {
      case (null) { Runtime.trap("Session not found") };
      case (?expiry) {
        if (Time.now() > expiry) {
          sessions.remove(caller);
          lastSeen.remove(caller);
          Runtime.trap("Session expired");
        } else {
          lastSeen.add(caller, Time.now());
        };
      };
    };
  };

  public shared ({ caller }) func heartbeat() : async () {
    await validateSession();
    lastSeen.add(caller, Time.now());
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

  public query ({ caller }) func getVisitorStats() : async VisitorStats {
    let now = Time.now();
    let onlineCount = lastSeen.foldLeft(
      0,
      func(count, _p, lastSeenTime) {
        if (now - lastSeenTime < onlineWindowNs) {
          count + 1;
        } else {
          count;
        };
      },
    );
    {
      totalVisits;
      onlineNow = onlineCount;
    };
  };
};
