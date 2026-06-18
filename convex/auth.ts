import { Password } from "@convex-dev/auth/providers/Password";
import { convexAuth } from "@convex-dev/auth/server";

/**
 * Convex Auth. Stage 0 uses the email+password provider so auth is testable without OAuth keys.
 * Additional providers (OAuth, magic links) can be added here later.
 */
export const { auth, signIn, signOut, store, isAuthenticated } = convexAuth({
  providers: [Password],
});
