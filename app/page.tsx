const foundations = [
  "Workspace-isolated records",
  "Event-first session capture",
  "Vehicle, tire, pad, and maintenance history",
  "Reusable pre-event workflows",
];

export default function Home() {
  return (
    <main>
      <section className="hero">
        <p className="eyebrow">BALL PIT MOTORSPORTS</p>
        <h1>THE GRID</h1>
        <p className="lede">A multi-user motorsports operating system built from the track up.</p>
        <div className="status">FOUNDATION INITIALIZED</div>
      </section>
      <section className="content" aria-labelledby="foundation-heading">
        <p className="eyebrow">VERSION 0.1</p>
        <h2 id="foundation-heading">Production foundation</h2>
        <ul>{foundations.map((item) => <li key={item}>{item}</li>)}</ul>
        <p className="note">The first private workspace will be Ball Pit Motorsports. Public access remains opt-in and privacy-filtered.</p>
      </section>
    </main>
  );
}
