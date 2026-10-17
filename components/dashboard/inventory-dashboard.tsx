"use client";
import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useReducedMotion } from "framer-motion";
import { ArrowUpRight, Heart, Info } from "lucide-react";
import { decrementItem, flagBathroom } from "@/app/actions/inventory";
import { alphabetical } from "@/lib/utils/inventory";
import { distanceKm } from "@/lib/utils/distance";
import { useProximitySort } from "@/hooks/use-proximity-sort";
import { useBathroomCooldown } from "@/hooks/use-bathroom-cooldown";
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
import { FlowerDecoration } from "@/components/ui/flower-decoration";

type Operation = { bathroomId: string; requestId: string } & (
  { event: "take"; item: ItemType } | { event: "report"; reason: ReportReason }
);

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
  const [now, setNow] = useState(initial.ok ? initial.snapshot.fetchedAt : 0);
  const [active, setActive] = useState<Operation | null>(null);
  const [uncertain, setUncertain] = useState<Operation | null>(null);
  const [notice, setNotice] = useState("");
  const [report, setReport] = useState<Bathroom | null>(null);
  const locked = useRef(false);
  const reduceMotion = useReducedMotion();
  const cooldown = useBathroomCooldown();
  const { position, locating, locate } = useProximitySort();
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
      setNow(Date.now());
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
          ? await decrementItem({ bathroomId, requestId, item: operation.item })
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
        setNow(result.snapshot.fetchedAt);
        setReadError("");
        setUncertain(null);
        if (operation.event === "take") {
          cooldown.start(bathroomId);
          setNotice("Count updated. Take care of yourself, Aggie. ♥");
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
    if (cooldown.remaining(bathroom.id) || bathroom[item] <= 0 || uncertain)
      return;
    void perform({
      event: "take",
      bathroomId: bathroom.id,
      item,
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
        <div className="section-kicker">
          <p className="eyebrow">A CAMPUS THAT CARES</p>
          <span>
            Little essentials. A big difference. <Heart size={14} />
          </span>
        </div>
        <h2 id="overview-title" className="sr-only">
          Campus inventory overview
        </h2>
        <StatsCards snapshot={snapshot} />
      </section>
      <section
        className="how-it-works content-width"
        id="how-it-works"
        aria-label="How it works"
      >
        <span>
          <b>01</b> Find a bathroom.
        </span>
        <FlowerDecoration />
        <span>
          <b>02</b> Take what you need.
        </span>
        <FlowerDecoration />
        <span>
          <b>03</b> Tap to keep us in the loop.
        </span>
      </section>
      <section
        className="inventory-section content-width"
        id="inventory"
        aria-labelledby="inventory-title"
      >
        <div className="inventory-heading">
          <div>
            <p className="eyebrow">YOUR NEXT STOP</p>
            <h2 id="inventory-title">
              Find your essentials
              <FlowerDecoration />.
            </h2>
            <p>A little peace of mind, just around the corner.</p>
          </div>
          <span className="live-label">
            <span />
            {snapshot
              ? `${bathrooms.length} campus locations`
              : "Campus inventory"}
          </span>
        </div>
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
        <div className="table-help">
          <Info size={14} />
          <span>
            Taking a product? Tap <strong>−1</strong> to help keep these counts
            up to date.
          </span>
        </div>
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
              now: now || snapshot.fetchedAt,
              cooldown: cooldown.remaining(bathroom.id),
              busy: !!active,
              activeItem:
                active?.bathroomId === bathroom.id && active.event === "take"
                  ? active.item
                  : undefined,
              retrying: !!uncertain,
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
          <span>
            <Heart size={12} /> Stocked by our community. Updated by you.
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
