import Link from "next/link";
import { createVehicle } from "@/app/actions";
import VehicleForm from "../VehicleForm";

export default async function NewVehiclePage({ searchParams }: { searchParams: Promise<Record<string, string>> }) {
  const query = await searchParams;
  return <main className="dashboard-main"><Link className="back-link" href="/dashboard/vehicles">← Vehicles</Link><section className="page-title compact-title"><p className="eyebrow">ADD TO THE PIT</p><h1>New vehicle</h1><p>Create the garage file now; complete the detailed profile after saving.</p></section>{query.error && <p className="alert">The vehicle could not be saved. Check the required fields.</p>}<VehicleForm action={createVehicle} /></main>;
}
