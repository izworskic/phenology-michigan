import { fetchConditions } from "../../lib/sources";

export default async function handler(req, res) {
  const data = await fetchConditions();
  res.setHeader("Cache-Control", "s-maxage=600, stale-while-revalidate=1800");
  res.status(200).json(data);
}
