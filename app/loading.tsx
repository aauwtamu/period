export default function Loading() {
  return (
    <main
      className="content-width loading-page"
      aria-busy="true"
      aria-label="Loading campus inventory"
    >
      <p className="footer-wordmark">tamuperiod.</p>
      <h1>A little care is on its way.</h1>
      <p>Finding the latest campus counts…</p>
      <div className="stats-grid">
        {[1, 2, 3].map((n) => (
          <div className="skeleton stat-card" key={n} />
        ))}
      </div>
    </main>
  );
}
