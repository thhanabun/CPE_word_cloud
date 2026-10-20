import CloudPage from "@/components/cloud-page";
import { hasScreenSession } from "@/lib/security";

export default async function Home() {
  return <CloudPage isScreen={await hasScreenSession()} />;
}
