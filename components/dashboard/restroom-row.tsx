import { Flag, MapPin } from "lucide-react";
import { ITEMS, type Bathroom, type ItemType } from "@/types/inventory";
import { ProductCounter } from "./product-counter";
import { RelativeTime } from "./relative-time";

export interface RowProps {
  bathroom: Bathroom;
  distance?: number;
  now: number;
  cooldown: number;
  busy: boolean;
  activeItem?: ItemType;
  retrying: boolean;
  take: (item: ItemType) => void;
  report: () => void;
}
function Supplier({ bathroom: b }: { bathroom: Bathroom }) {
  const url = /^https?:\/\//i.test(b.socials) ? b.socials : null;
  return (
    <span className="supplier">
      Stocked by{" "}
      {url ? (
        <a href={url} target="_blank" rel="noreferrer">
          {b.supplier || "our community"}
        </a>
      ) : (
        <span title={b.socials || undefined}>
          {b.supplier || "our community"}
        </span>
      )}
    </span>
  );
}
export function RestroomRow({
  bathroom: b,
  distance,
  now,
  cooldown,
  busy,
  activeItem,
  retrying,
  take,
  report,
}: RowProps) {
  return (
    <tr className="restroom-row">
      <td className="location-cell">
        <div className="location-name">
          <span className="location-icon">
            <MapPin size={17} />
          </span>
          <div>
            <strong>{b.building}</strong>
            <span>
              Room {b.room} <span className="middot">·</span> Floor{" "}
              {b.floor || "—"}
            </span>
          </div>
        </div>
        <Supplier bathroom={b} />
        {distance !== undefined && (
          <span className="distance-label">
            {distance < 1
              ? `${Math.round(distance * 1000)} m away`
              : `${distance.toFixed(1)} km away`}
          </span>
        )}
      </td>
      {ITEMS.map((item) => (
        <td key={item} className="product-cell">
          <ProductCounter
            item={item}
            count={b[item]}
            disabled={busy || cooldown > 0 || retrying}
            pending={busy && activeItem === item}
            take={() => take(item)}
            location={`${b.building} ${b.room}`}
          />
        </td>
      ))}
      <td className="status-cell">
        <span
          className={`status-badge ${b.needsRestock ? "needs-care" : "all-good"}`}
        >
          <span />
          {b.needsRestock ? "Needs restock" : "No reports"}
        </span>
        <span className="updated-label">
          <RelativeTime value={b.lastUpdated} now={now} />
        </span>
        <button
          className="report-link"
          onClick={report}
          disabled={busy || retrying || b.needsRestock}
        >
          <Flag size={12} />
          {b.needsRestock ? "Reported" : "Request restock"}
        </button>
        {cooldown > 0 && (
          <span className="cooldown-label">Another item in {cooldown}s</span>
        )}
      </td>
    </tr>
  );
}
