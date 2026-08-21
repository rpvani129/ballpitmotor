"use client";

import Link from "next/link";
import { useEffect, useRef, useTransition } from "react";

export default function FirstTimeDialog({ action }: { action: (formData: FormData) => Promise<void> }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [pending, startTransition] = useTransition();
  useEffect(() => { dialog.current?.showModal(); }, []);

  return <dialog className="welcome-dialog" ref={dialog}>
    <div className="welcome-dialog-heading"><div><p className="eyebrow">WELCOME TO THE GRID</p><h2>Build your paddock.</h2></div><button className="dialog-close" type="button" aria-label="Close" onClick={() => dialog.current?.close()}>×</button></div>
    <p className="welcome-intro">Start with your equipment, confirm your tracks, then create your first event.</p>
    <aside className="welcome-import-path">
      <div><strong>Already have your setup in a spreadsheet?</strong><p>Use Data Management to download the Grid workbook, add your vehicles, tires, pads, tracks, and controlled lists, then upload everything for review.</p></div>
      <Link className="button outline" href="/dashboard/data-management">Import existing data →</Link>
    </aside>
    <ol className="welcome-steps">
      <li><span>01</span><div><strong>Add your vehicle</strong><p>Create the garage record that events and service history will use.</p><Link href="/dashboard/vehicles/new">Add vehicle →</Link></div></li>
      <li><span>02</span><div><strong>Add tires and pads</strong><p>Set up the consumables you will assign to events.</p><Link href="/dashboard/consumables">Open tires + pads →</Link></div></li>
      <li><span>03</span><div><strong>Review your tracks</strong><p>Your starter track list and configurations are already loaded.</p><Link href="/dashboard/tracks">Review tracks →</Link></div></li>
      <li><span>04</span><div><strong>Create your first event</strong><p>Bring the vehicle, equipment, track, and checklist together.</p><Link href="/dashboard/events/new">Create event →</Link></div></li>
    </ol>
    <form action={(formData) => startTransition(async () => { await action(formData); dialog.current?.close(); })} className="welcome-preference">
      <label><input type="checkbox" name="show_first_time_popup" value="true" defaultChecked /> Show on login</label>
      <button className="button dark" disabled={pending}>{pending ? "Saving…" : "Save & close"}</button>
    </form>
  </dialog>;
}
