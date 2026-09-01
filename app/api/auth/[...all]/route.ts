import { toNextJsHandler } from "better-auth/next-js";
import { auth } from "@/src/modules/identity";

export const { GET, POST } = toNextJsHandler(auth);
