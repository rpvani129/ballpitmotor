// Calendar dates use the tracks' local day, independent of the viewer's timezone.
export function calendarDate(value: string): string {
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return value;
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/Chicago', year: 'numeric', month: '2-digit', day: '2-digit',
  }).formatToParts(new Date(value));
  const part = (name: string) => parts.find(item => item.type === name)!.value;
  return `${part('year')}-${part('month')}-${part('day')}`;
}

export function monthDays(month: string): (string | null)[] {
  const [year, number] = month.split('-').map(Number);
  const first = new Date(Date.UTC(year, number - 1, 1));
  const count = new Date(Date.UTC(year, number, 0)).getUTCDate();
  const days: (string | null)[] = Array(first.getUTCDay()).fill(null);
  for (let day = 1; day <= count; day++) days.push(`${month}-${String(day).padStart(2, '0')}`);
  while (days.length % 7) days.push(null);
  return days;
}

export function moveMonth(month: string, offset: number): string {
  const [year, number] = month.split('-').map(Number);
  return new Date(Date.UTC(year, number - 1 + offset, 1)).toISOString().slice(0, 7);
}

export function occursOn(event: { startDate: string; endDate?: string | null }, day: string): boolean {
  return event.startDate <= day && day <= (event.endDate || event.startDate);
}
