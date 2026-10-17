import { Search, LocateFixed, RefreshCw, ChevronDown } from "lucide-react";

interface Props {
  search: string;
  setSearch: (v: string) => void;
  building: string;
  setBuilding: (v: string) => void;
  buildings: string[];
  nearby: boolean;
  locating: boolean;
  locate: () => void;
  refreshing: boolean;
  refresh: () => void;
}
export function InventoryToolbar(p: Props) {
  return (
    <div className="inventory-toolbar">
      <label className="search-field">
        <Search size={18} />
        <span className="sr-only">Search building or room</span>
        <input
          value={p.search}
          onChange={(e) => p.setSearch(e.target.value)}
          placeholder="Search a building or room…"
        />
      </label>
      <label className="building-select">
        <span className="sr-only">Filter by building</span>
        <select
          value={p.building}
          onChange={(e) => p.setBuilding(e.target.value)}
        >
          <option value="">All buildings</option>
          {p.buildings.map((b) => (
            <option key={b}>{b}</option>
          ))}
        </select>
        <ChevronDown size={15} />
      </label>
      <button
        className={`button button-outline proximity-button ${p.nearby ? "selected" : ""}`}
        onClick={p.locate}
        disabled={p.locating}
        aria-pressed={p.nearby}
      >
        <LocateFixed size={16} />
        {p.locating
          ? "Finding you…"
          : p.nearby
            ? "Nearest first"
            : "Sort by proximity"}
      </button>
      <button
        className="icon-button"
        onClick={p.refresh}
        disabled={p.refreshing}
        aria-label="Refresh inventory"
      >
        <RefreshCw size={17} className={p.refreshing ? "spin" : ""} />
      </button>
    </div>
  );
}
