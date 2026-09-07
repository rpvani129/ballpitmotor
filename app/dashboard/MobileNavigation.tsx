"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { signOut } from "@/app/actions";

const primaryLinks = [
  { href: "/dashboard", label: "Events" },
  { href: "/dashboard/vehicles", label: "Vehicles" },
  { href: "/dashboard/consumables", label: "Tires + Pads" },
];

const moreLinks = [
  { href: "/dashboard/tracks", label: "Tracks", detail: "Locations and configurations" },
  { href: "/dashboard/checklists", label: "Checklists", detail: "Templates and event preparation" },
  { href: "/dashboard/reports", label: "Reports", detail: "Performance and equipment life" },
  { href: "/dashboard/data-management", label: "Data Management", detail: "Imports, exports and data quality" },
];

function isActive(pathname: string, href: string) {
  return href === "/dashboard" ? pathname === href : pathname.startsWith(href);
}

export default function MobileNavigation() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  return <>
    {open && <button className="mobile-nav-backdrop" type="button" aria-label="Close navigation" onClick={() => setOpen(false)} />}
    <aside className={`mobile-nav-sheet${open ? " open" : ""}`} id="mobile-navigation-sheet" aria-hidden={!open} inert={!open}>
      <div className="mobile-nav-sheet-heading">
        <div><span>THE GRID</span><strong>Navigation</strong></div>
        <button type="button" onClick={() => setOpen(false)} aria-label="Close navigation">×</button>
      </div>
      <nav aria-label="Expanded mobile navigation">
        {moreLinks.map((link) => <Link className={isActive(pathname, link.href) ? "active" : ""} href={link.href} key={link.href} onClick={() => setOpen(false)}>
          <strong>{link.label}</strong><span>{link.detail}</span>
        </Link>)}
      </nav>
      <div className="mobile-nav-account">
        <Link href="/dashboard/profile" onClick={() => setOpen(false)}>Profile</Link>
        <a href="https://ballpitmotor.com">Ball Pit Motorsports ↗</a>
        <form action={signOut}><button className="text-button">Log out</button></form>
      </div>
    </aside>
    <nav className="mobile-bottom-nav" aria-label="Mobile navigation">
      {primaryLinks.map((link) => <Link className={isActive(pathname, link.href) ? "active" : ""} href={link.href} key={link.href}>
        {link.label}
      </Link>)}
      <button className={open ? "active" : ""} type="button" aria-expanded={open} aria-controls="mobile-navigation-sheet" onClick={() => setOpen((current) => !current)}>
        <span className="mobile-menu-icon" aria-hidden="true"><i /><i /><i /></span>More
      </button>
    </nav>
  </>;
}
