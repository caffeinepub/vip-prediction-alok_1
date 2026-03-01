import Map "mo:core/Map";
import Principal "mo:core/Principal";

module {
  type OldActor = {
    sessions : Map.Map<Principal, Int>;
  };

  type NewActor = {
    sessions : Map.Map<Principal, Int>;
    lastSeen : Map.Map<Principal, Int>;
    totalVisits : Nat;
  };

  public func run(old : OldActor) : NewActor {
    {
      old with
      lastSeen = Map.empty<Principal, Int>();
      totalVisits = 0;
    };
  };
};
