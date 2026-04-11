import { permanentRedirect } from "next/navigation";

export default function CookiesPage() {
  permanentRedirect("/privacy");
}
