// A consumer outside src/modules is still a consumer. Rule 3 used to ignore
// these entirely, which is how every app/ route came to bypass the index.
import { isLocale } from "@/src/modules/localization/config";

export default function Page() {
  return isLocale("ka");
}
