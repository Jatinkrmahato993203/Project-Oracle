import { db } from "./index.ts";
import { users } from "./schema.ts";
import { eq } from "drizzle-orm";

export async function getOrCreateUser(
  uid: string,
  email: string,
  name?: string,
) {
  try {
    const result = await db
      .insert(users)
      .values({
        uid,
        email,
        name,
      })
      .onConflictDoUpdate({
        target: users.uid,
        set: {
          email,
          name,
        },
      })
      .returning();
    return result[0];
  } catch (error) {
    console.error("Error in getOrCreateUser:", error);
    throw new Error("Failed to register or update user", { cause: error });
  }
}

export async function updateUserPriors(uid: string, priors: any) {
  try {
    const result = await db
      .update(users)
      .set({ onboardingPriors: priors })
      .where(eq(users.uid, uid))
      .returning();
    return result[0];
  } catch (error) {
    console.error("Error in updateUserPriors:", error);
    throw new Error("Failed to update user priors", { cause: error });
  }
}
