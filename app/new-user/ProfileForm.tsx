"use client";

import { useState } from "react";

type Profile = { first_name?: string; last_name?: string; driver_name?: string; driver_number?: string | null; team_name?: string | null };

export default function ProfileForm({ action, profile, includeCredentials = false, mode = "new" }: { action: (formData: FormData) => void | Promise<void>; profile?: Profile; includeCredentials?: boolean; mode?: "new" | "edit" }) {
  const [firstName, setFirstName] = useState(profile?.first_name ?? "");
  const [lastName, setLastName] = useState(profile?.last_name ?? "");
  const startingDefault = [profile?.first_name, profile?.last_name].filter(Boolean).join("-");
  const [driverName, setDriverName] = useState(profile?.driver_name ?? startingDefault);
  const updateDefaultName = (nextFirst: string, nextLast: string) => {
    const currentDefault = [firstName, lastName].filter(Boolean).join("-");
    if (!driverName || driverName === currentDefault) setDriverName([nextFirst, nextLast].filter(Boolean).join("-"));
  };
  return <form className="profile-form" action={action}>
    <input type="hidden" name="profile_mode" value={mode} />
    {includeCredentials && <><label className="span-2">Email<input name="email" type="email" autoComplete="email" required /></label><label className="span-2">Password<input name="password" type="password" autoComplete="new-password" minLength={8} required /></label></>}
    <label>First name<input name="first_name" value={firstName} onChange={(event) => { updateDefaultName(event.target.value, lastName); setFirstName(event.target.value); }} autoComplete="given-name" required /></label>
    <label>Last name<input name="last_name" value={lastName} onChange={(event) => { updateDefaultName(firstName, event.target.value); setLastName(event.target.value); }} autoComplete="family-name" required /></label>
    <label className="span-2">Driver name<input name="driver_name" value={driverName} onChange={(event) => setDriverName(event.target.value)} required /><small>This creates your personalized public link. It defaults to First-Name-Last-Name.</small></label>
    <label>Driver number <span>Optional</span><input name="driver_number" defaultValue={profile?.driver_number ?? ""} maxLength={20} /></label>
    <label>Team name <span>Optional</span><input name="team_name" defaultValue={profile?.team_name ?? ""} maxLength={120} /></label>
    <button className="button primary span-2">{mode === "edit" ? "Save profile" : includeCredentials ? "Create account" : "Complete profile"}</button>
  </form>;
}
