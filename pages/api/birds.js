import { fetchBirds } from "../../lib/sources";

export default async function handler(req, res) {
  const data = await fetchBirds();
  res.setHeader("Cache-Control", "s-maxage=1800, stale-while-revalidate=3600");
  res.status(200).json({ sightings: data });
}
