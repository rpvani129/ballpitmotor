export type AttendanceStatus = "interested" | "going" | "none";
export type AttendanceFilter = "all" | "interested" | "going" | "both";

// A linked tracker event is the commitment. A weekend cloned into several days
// still counts once in Discover. Keep the bookmark so cancelling/removing the
// tracker plan can return an event to Interested without losing the shortlist.
export function discoverAttendance(id: string, interested: ReadonlySet<string>, going: ReadonlySet<string>): AttendanceStatus {
  if (going.has(id)) return "going";
  return interested.has(id) ? "interested" : "none";
}

export function matchesAttendance(status: AttendanceStatus, filter: AttendanceFilter) {
  if (filter === "all") return true;
  if (filter === "both") return status === "interested" || status === "going";
  return status === filter;
}
