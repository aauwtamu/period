import { RestroomRow, type RowProps } from "./restroom-row";
export function RestroomList({ rows }: { rows: RowProps[] }) {
  return (
    <div className="table-wrap">
      <table className="restroom-table">
        <caption className="sr-only">
          Campus bathroom product inventory. Tap Take once for each item.
        </caption>
        <thead>
          <tr>
            <th scope="col">LOCATION</th>
            <th scope="col">PADS</th>
            <th scope="col">TAMPONS</th>
            <th scope="col">LINERS</th>
            <th scope="col">OTHER</th>
            <th scope="col">STATUS</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <RestroomRow key={r.bathroom.id} {...r} />
          ))}
        </tbody>
      </table>
      {rows.length === 0 && (
        <div className="empty-results">
          <strong>No locations found.</strong>
          <p>Try a different building or clear your search.</p>
        </div>
      )}
    </div>
  );
}
