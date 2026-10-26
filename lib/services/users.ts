import type { Prisma } from "@/app/generated/prisma/client";
import { AppError, isUniqueViolation } from "@/lib/errors";
import { DUMMY_PASSWORD_HASH, hashPassword, verifyPassword } from "@/lib/password";
import { prisma } from "@/lib/prisma";
import {
  changePasswordSchema,
  createUserSchema,
  loginSchema,
  resetPasswordSchema,
  updateUserSchema,
  type ChangePasswordInput,
  type CreateUserInput,
  type LoginInput,
  type ResetPasswordInput,
  type UpdateUserInput,
} from "@/lib/validation/users";
import type { ActorOptions } from "./types";

// Users are never deleted: sales and stock movements point to them. Deactivate
// instead, which also ends their sessions.

const publicUser = {
  id: true,
  name: true,
  email: true,
  role: true,
  isActive: true,
  createdAt: true,
} satisfies Prisma.UserSelect;

function rethrow(error: unknown, email: string): never {
  if (isUniqueViolation(error)) throw new AppError("CONFLICT", `A user with the email ${email} already exists.`);
  throw error;
}

/**
 * Checks an email and password. Returns the user or throws INVALID_LOGIN.
 * The message is the same for an unknown email and a wrong password, so the
 * login form can't be used to find out which emails have accounts.
 */
export async function authenticate(input: LoginInput) {
  const { email, password } = loginSchema.parse(input);
  const user = await prisma.user.findUnique({
    where: { email },
    select: { id: true, isActive: true, passwordHash: true },
  });
  const valid = await verifyPassword(password, user?.passwordHash ?? DUMMY_PASSWORD_HASH);

  if (!user || !valid) throw new AppError("INVALID_LOGIN", "Email or password is incorrect.");
  // Only someone who knows the password learns that the account is deactivated.
  if (!user.isActive) throw new AppError("INVALID_LOGIN", "This account has been deactivated. Ask an admin.");
  return { id: user.id };
}

export function listUsers() {
  return prisma.user.findMany({
    select: { ...publicUser, _count: { select: { sales: true } } },
    orderBy: [{ isActive: "desc" }, { name: "asc" }],
  });
}

export function getUser(id: string) {
  return prisma.user.findUnique({ where: { id }, select: publicUser });
}

export function countUsers() {
  return prisma.user.count();
}

export async function createUser(input: CreateUserInput) {
  const { password, ...data } = createUserSchema.parse(input);
  try {
    return await prisma.user.create({
      data: { ...data, passwordHash: await hashPassword(password) },
      select: publicUser,
    });
  } catch (error) {
    rethrow(error, data.email);
  }
}

/**
 * Edits a user. Two rules stop the shop from locking itself out:
 *   - admins can't change their own role or deactivate themselves
 *   - there must always be at least one active admin
 */
export async function updateUser(id: string, input: UpdateUserInput, { userId }: ActorOptions = {}) {
  const data = updateUserSchema.parse(input);

  try {
    // Serializable: two admins demoting each other at the same moment can't
    // both succeed and leave no admin (PostgreSQL aborts one of them).
    return await prisma.$transaction(
      async (tx) => {
        const current = await tx.user.findUnique({ where: { id }, select: { role: true, isActive: true } });
        if (!current) throw new AppError("NOT_FOUND", "This user no longer exists.");
        if (id === userId && (data.role !== current.role || !data.isActive)) {
          throw new AppError("FORBIDDEN", "You can't change your own role or deactivate yourself.");
        }

        const user = await tx.user.update({ where: { id }, data, select: publicUser });

        const admins = await tx.user.count({ where: { role: "ADMIN", isActive: true } });
        if (admins === 0) throw new AppError("INVALID_STATE", "There must be at least one active admin.");

        if (!data.isActive) await tx.session.deleteMany({ where: { userId: id } });
        return user;
      },
      { isolationLevel: "Serializable" },
    );
  } catch (error) {
    rethrow(error, data.email);
  }
}

/** An admin sets a new password for someone. All their sessions end. */
export async function resetPassword(input: ResetPasswordInput) {
  const { userId, password } = resetPasswordSchema.parse(input);
  const passwordHash = await hashPassword(password);
  await prisma.$transaction(async (tx) => {
    const { count } = await tx.user.updateMany({ where: { id: userId }, data: { passwordHash } });
    if (count === 0) throw new AppError("NOT_FOUND", "This user no longer exists.");
    await tx.session.deleteMany({ where: { userId } });
  });
}

/** A user changes their own password. Other browsers are logged out; this one stays in. */
export async function changePassword(userId: string, currentSessionId: string, input: ChangePasswordInput) {
  const data = changePasswordSchema.parse(input);
  const user = await prisma.user.findUniqueOrThrow({ where: { id: userId }, select: { passwordHash: true } });
  if (!(await verifyPassword(data.currentPassword, user.passwordHash))) {
    throw new AppError("INVALID_LOGIN", "Your current password is incorrect.");
  }

  const passwordHash = await hashPassword(data.newPassword);
  await prisma.$transaction([
    prisma.user.update({ where: { id: userId }, data: { passwordHash } }),
    prisma.session.deleteMany({ where: { userId, id: { not: currentSessionId } } }),
  ]);
}
