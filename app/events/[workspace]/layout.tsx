import Link from "next/link";

export default async function PublicEventsLayout({ children, params }: { children: React.ReactNode; params: Promise<{ workspace: string }> }) {
  const { workspace } = await params;
  return <div className="public-shell"><header className="public-topbar"><Link href={`/events/${workspace}`}><span>BALL PIT MOTORSPORTS</span><strong>THE GRID</strong></Link><a href="https://ballpitmotor.com">Ball Pit Motorsports ↗</a></header>{children}<footer className="app-footer"><span>© 2026 RMKS Partners LLC d/b/a Ball Pit Motorsports</span><span>Public lap-time archive</span></footer></div>;
}
