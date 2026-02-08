import "server-only";

import { eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";

import type { User } from "./schema";
import { user } from "./schema";
import { generateHashedPassword } from "./utils";

function getPostgresUrl(): string {
  const url = process.env.POSTGRES_URL;
  if (!url) {
    throw new Error("POSTGRES_URL is not defined");
  }
  return url;
}

const client = postgres(getPostgresUrl());
const db = drizzle(client);

export async function getUser(email: string): Promise<User[]> {
  return await db.select().from(user).where(eq(user.email, email));
}

export async function createUser(email: string, password: string) {
  const hashedPassword = generateHashedPassword(password);
  return await db.insert(user).values({ email, password: hashedPassword });
}

export async function createGuestUser() {
  const email = `guest-${Date.now()}`;
  const hashedPassword = generateHashedPassword(crypto.randomUUID());

  return await db
    .insert(user)
    .values({ email, password: hashedPassword })
    .returning({
      id: user.id,
      email: user.email,
    });
}
