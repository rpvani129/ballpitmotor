"use client";

import { useRef } from "react";
import { deleteEventNote } from "@/app/actions";

export default function DeleteNoteButton({ eventId, noteId }: { eventId: string; noteId: string }) {
  const dialog = useRef<HTMLDialogElement>(null);
  return <><button className="button danger" type="button" onClick={() => dialog.current?.showModal()}>Delete note</button><dialog className="confirm-dialog" ref={dialog}><p className="eyebrow">CONFIRM DELETE</p><h2>Delete this note?</h2><p>This permanently removes the journal entry from the event.</p><div><button className="button ghost" type="button" onClick={() => dialog.current?.close()}>Cancel</button><form action={deleteEventNote}><input type="hidden" name="event_id" value={eventId} /><input type="hidden" name="note_id" value={noteId} /><button className="button danger">Delete permanently</button></form></div></dialog></>;
}
