// Creates an admin account, e.g. the very first one on a new database.
// Run with: npm run db:create-admin
//
// Asks for the name, email and password. For automated setups they can come
// from ADMIN_NAME, ADMIN_EMAIL and ADMIN_PASSWORD instead.
import "dotenv/config";
import { createInterface } from "node:readline/promises";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { createUser } from "../lib/services/users";

async function ask(question: string, hidden = false) {
  const rl = createInterface({ input: process.stdin, output: process.stdout, terminal: true });
  if (hidden) {
    // Print the question but not the characters typed after it.
    const output = rl as unknown as { _writeToOutput: (text: string) => void };
    output._writeToOutput = (text) => {
      if (text.includes(question)) process.stdout.write(text);
    };
  }
  const answer = await rl.question(question);
  rl.close();
  if (hidden) process.stdout.write("\n");
  return answer;
}

async function main() {
  const name = process.env.ADMIN_NAME ?? (await ask("Name: "));
  const email = process.env.ADMIN_EMAIL ?? (await ask("Email: "));
  const password = process.env.ADMIN_PASSWORD ?? (await ask("Password (at least 8 characters): ", true));

  const user = await createUser({ name, email, password, role: "ADMIN" });
  console.log(`Admin created: ${user.name} <${user.email}>. Log in at /login.`);
}

main()
  .catch((error: unknown) => {
    if (error instanceof z.ZodError) {
      console.error(z.prettifyError(error));
    } else {
      console.error(error instanceof Error ? error.message : error);
    }
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
