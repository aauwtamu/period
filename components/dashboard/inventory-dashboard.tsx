"use client";
import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useReducedMotion } from "framer-motion";
import { ArrowUpRight } from "lucide-react";
import { decrementItem, flagBathroom } from "@/app/actions/inventory";
import { alphabetical } from "@/lib/utils/inventory";
import { distanceKm } from "@/lib/utils/distance";
import { useProximitySort } from "@/hooks/use-proximity-sort";
import type {
  Bathroom,
  InventoryLoad,
  InventorySnapshot,
  ItemType,
  ReportReason,
} from "@/types/inventory";
import { StatsCards } from "./stats-cards";
import { InventoryToolbar } from "./inventory-toolbar";
import { RestroomList } from "./restroom-list";
import { ReportDialog } from "./report-dialog";
import { InventoryStatus } from "./inventory-status";

type Operation = { bathroomId: string; requestId: string } & (
  | { event: "take"; item: ItemType; quantity: number }
  | { event: "report"; reason: ReportReason }
);
const VISIT_KEY = "tamuperiod:taken-this-visit:";
function storedVisitCount(bathroomId: string) {
  try {
    const value = Number(sessionStorage.getItem(VISIT_KEY + bathroomId));
    return Number.isInteger(value) && value > 0 ? Math.min(5, value) : 0;
  } catch {
    return 0;
  }
}

export function InventoryDashboard({ initial }: { initial: InventoryLoad }) {
  const router = useRouter();
  const [refreshing, startRefresh] = useTransition();
  const [previousInitial, setPreviousInitial] = useState(initial);
  const [snapshot, setSnapshot] = useState<InventorySnapshot | null>(
    initial.ok ? initial.snapshot : null,
  );
  const [readError, setReadError] = useState(initial.ok ? "" : initial.message);
  const [search, setSearch] = useState("");
  const [building, setBuilding] = useState("");
  const [active, setActive] = useState<Operation | null>(null);
  const [uncertain, setUncertain] = useState<Operation | null>(null);
  const [notice, setNotice] = useState("");
  const [report, setReport] = useState<Bathroom | null>(null);
  const locked = useRef(false);
  const taken = useRef<Record<string, number>>({});
  const [takenThisVisit, setTakenThisVisit] = useState<Record<string, number>>({});
  const reduceMotion = useReducedMotion();
  const { position, locating, locate } = useProximitySort();
  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      try {
        const counts: Record<string, number> = {};
        for (let index = 0; index < sessionStorage.length; index++) {
          const key = sessionStorage.key(index);
          if (!key?.startsWith(VISIT_KEY)) continue;
          const bathroomId = key.slice(VISIT_KEY.length);
          const value = storedVisitCount(bathroomId);
          if (value > 0) counts[bathroomId] = value;
        }
        taken.current = counts;
        setTakenThisVisit(counts);
      } catch {
        // The in-memory limit still applies if storage is unavailable.
      }
    });
    return () => window.cancelAnimationFrame(frame);
  }, []);
  // Reconcile server props without resetting filters or undoing a confirmed write.
  if (initial !== previousInitial) {
    setPreviousInitial(initial);
    setReadError(initial.ok ? "" : initial.message);
    if (
      initial.ok &&
      (!snapshot || initial.snapshot.fetchedAt >= snapshot.fetchedAt)
    )
      setSnapshot(initial.snapshot);
  }
  function refresh() {
    startRefresh(() => router.refresh());
  }
  useEffect(() => {
    const refreshVisible = () => {
      if (!document.hidden) startRefresh(() => router.refresh());
    };
    const timer = window.setInterval(() => {
      refreshVisible();
    }, 30_000);
    document.addEventListener("visibilitychange", refreshVisible);
    return () => {
      clearInterval(timer);
      document.removeEventListener("visibilitychange", refreshVisible);
    };
  }, [router]);

  async function perform(operation: Operation) {
    if (locked.current) return;
    locked.current = true;
    setActive(operation);
    setNotice("");
    try {
      const { bathroomId, requestId } = operation;
      const result =
        operation.event === "take"
          ? await decrementItem({
              bathroomId,
              requestId,
              item: operation.item,
              quantity: operation.quantity,
            })
          : await flagBathroom({
              bathroomId,
              requestId,
              reason: operation.reason,
            });
      if (result.ok) {
        setSnapshot((old) =>
          !old || result.snapshot.fetchedAt >= old.fetchedAt
            ? result.snapshot
            : old,
        );
        setReadError("");
        setUncertain(null);
        if (operation.event === "take") {
          const count = Math.min(5, (taken.current[bathroomId] ?? 0) + 1);
          taken.current = { ...taken.current, [bathroomId]: count };
          setTakenThisVisit(taken.current);
          try {
            sessionStorage.setItem(VISIT_KEY + bathroomId, String(count));
          } catch {
            // In-memory count remains available.
          }
          setNotice(
            count === 5 ? "Five items recorded for this visit." : "Count updated.",
          );
        } else {
          setNotice(
            result.applied
              ? "Reported. Thanks for looking out for the next person!"
              : "This location has already been reported. Thank you for checking!",
          );
          if (result.applied && !reduceMotion)
            void import("canvas-confetti")
              .then(({ default: confetti }) => {
                confetti({
                  particleCount: 35,
                  spread: 55,
                  origin: { y: 0.7 },
                  colors: ["#b5224b", "#f194b5", "#ffd3df"],
                  disableForReducedMotion: true,
                });
              })
              .catch(() => {
                /* A confirmed report does not depend on decoration. */
              });
        }
      } else {
        setNotice(result.message);
        setUncertain(result.uncertain ? operation : null);
        if (!result.uncertain) refresh();
      }
    } catch {
      setUncertain(operation);
      setNotice(
        "We couldn’t confirm that update. Retry below; the same request won’t be counted twice.",
      );
    } finally {
      locked.current = false;
      setActive(null);
    }
  }
  function take(bathroom: Bathroom, item: ItemType) {
    if (
      bathroom[item] < 1 ||
      Math.max(taken.current[bathroom.id] ?? 0, storedVisitCount(bathroom.id)) >= 5 ||
      uncertain
    )
      return;
    void perform({
      event: "take",
      bathroomId: bathroom.id,
      item,
      quantity: 1,
      requestId: crypto.randomUUID(),
    });
  }
  const bathrooms = snapshot?.bathrooms ?? [];
  const buildings = [...new Set(bathrooms.map((b) => b.building))].sort();
  const query = search.toLowerCase().trim();
  const distance = (b: Bathroom) =>
    position && b.latitude !== null && b.longitude !== null
      ? distanceKm(
          position.latitude,
          position.longitude,
          b.latitude,
          b.longitude,
        )
      : undefined;
  const filtered = bathrooms
    .filter(
      (b) =>
        (!building || b.building === building) &&
        `${b.building} ${b.room} ${b.id}`.toLowerCase().includes(query),
    )
    .sort((a, b) => {
      if (position) {
        const difference =
          (distance(a) ?? Infinity) - (distance(b) ?? Infinity);
        if (!Number.isNaN(difference) && difference !== 0) return difference;
      }
      return alphabetical(a, b);
    });
  return (
    <div className="dashboard-section">
      <section
        className="content-width overview"
        aria-labelledby="overview-title"
      >
        <h2 id="overview-title" className="sr-only">
          Campus inventory overview
        </h2>
        <StatsCards snapshot={snapshot} />
      </section>
      <section
        className="inventory-section content-width"
        id="inventory"
        aria-labelledby="inventory-title"
      >
        <h2 id="inventory-title" className="sr-only">
          Campus product inventory
        </h2>
        <InventoryToolbar
          search={search}
          setSearch={setSearch}
          building={building}
          setBuilding={setBuilding}
          buildings={buildings}
          nearby={!!position}
          locating={locating}
          locate={locate}
          refreshing={refreshing}
          refresh={refresh}
        />
        <div className="action-notice" aria-live="polite" aria-atomic="true">
          {notice && (
            <div>
              <span>{notice}</span>
              {uncertain && (
                <button
                  className="button button-small"
                  onClick={() => void perform(uncertain)}
                  disabled={!!active}
                >
                  {active ? "Checking…" : "Retry same update"}
                  <ArrowUpRight size={14} />
                </button>
              )}
            </div>
          )}
        </div>
        {readError &&
          (snapshot ? (
            <p className="stale-notice" role="status">
              These counts may be out of date. Refresh to try again.
            </p>
          ) : (
            <InventoryStatus message={readError} retry={refresh} />
          ))}
        {snapshot && (
          <RestroomList
            rows={filtered.map((bathroom) => ({
              bathroom,
              distance: distance(bathroom),
              busy: !!active,
              activeItem:
                active?.bathroomId === bathroom.id && active.event === "take"
                  ? active.item
                  : undefined,
              retrying: !!uncertain,
              limitReached: (takenThisVisit[bathroom.id] ?? 0) >= 5,
              take: (item) => take(bathroom, item),
              report: () => setReport(bathroom),
            }))}
          />
        )}
        <div className="inventory-bottom">
          <span>
            {snapshot
              ? `Showing ${filtered.length} of ${bathrooms.length} locations`
              : "Counts will appear when available"}
          </span>
        </div>
      </section>
      {report && (
        <ReportDialog
          bathroom={report}
          close={() => setReport(null)}
          submit={(reason) => {
            const bathroomId = report.id;
            setReport(null);
            void perform({
              event: "report",
              bathroomId,
              reason,
              requestId: crypto.randomUUID(),
            });
          }}
        />
      )}
    </div>
  );
}
