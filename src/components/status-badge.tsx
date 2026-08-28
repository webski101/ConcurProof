import { WarningCircle } from "@phosphor-icons/react/dist/ssr";

export function ProvenanceBadge({
  provenance,
}: {
  provenance: "fixture" | "real-mozaik";
}) {
  const fixture = provenance === "fixture";
  return (
    <span className="cp-status" data-tone={fixture ? "error" : "signal"}>
      {fixture ? <WarningCircle size={12} weight="fill" /> : <span className="cp-live-pulse" />}
      {fixture ? "Demo / Fixture mode" : "Real Mozaik run"}
    </span>
  );
}
