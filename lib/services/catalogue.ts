import { AppError, isNotFound, isUniqueViolation } from "@/lib/errors";
import { prisma } from "@/lib/prisma";
import {
  categorySchema,
  supplierSchema,
  type CategoryInput,
  type SupplierInput,
} from "@/lib/validation/catalogue";

// Categories and suppliers are simple lookup tables. Deleting one keeps its
// products and only removes the link (onDelete: SetNull in the schema).

function rethrow(error: unknown, label: string, name: string): never {
  if (isUniqueViolation(error)) throw new AppError("CONFLICT", `A ${label} called "${name}" already exists.`);
  if (isNotFound(error)) throw new AppError("NOT_FOUND", `This ${label} no longer exists.`);
  throw error;
}

// ---------- Categories ----------

export function listCategories() {
  return prisma.category.findMany({
    include: { _count: { select: { products: true } } },
    orderBy: { name: "asc" },
  });
}

export function listCategoryOptions() {
  return prisma.category.findMany({ select: { id: true, name: true }, orderBy: { name: "asc" } });
}

export function getCategory(id: string) {
  return prisma.category.findUnique({ where: { id } });
}

export async function createCategory(input: CategoryInput) {
  const data = categorySchema.parse(input);
  try {
    return await prisma.category.create({ data });
  } catch (error) {
    rethrow(error, "category", data.name);
  }
}

export async function updateCategory(id: string, input: CategoryInput) {
  const data = categorySchema.parse(input);
  try {
    return await prisma.category.update({
      where: { id },
      data: { ...data, description: data.description ?? null },
    });
  } catch (error) {
    rethrow(error, "category", data.name);
  }
}

export async function deleteCategory(id: string) {
  const { count } = await prisma.category.deleteMany({ where: { id } });
  if (count === 0) throw new AppError("NOT_FOUND", "This category no longer exists.");
}

// ---------- Suppliers ----------

export function listSuppliers() {
  return prisma.supplier.findMany({
    include: { _count: { select: { products: true } } },
    orderBy: { name: "asc" },
  });
}

export function listSupplierOptions() {
  return prisma.supplier.findMany({ select: { id: true, name: true }, orderBy: { name: "asc" } });
}

export function getSupplier(id: string) {
  return prisma.supplier.findUnique({ where: { id } });
}

export async function createSupplier(input: SupplierInput) {
  const data = supplierSchema.parse(input);
  try {
    return await prisma.supplier.create({ data });
  } catch (error) {
    rethrow(error, "supplier", data.name);
  }
}

export async function updateSupplier(id: string, input: SupplierInput) {
  const data = supplierSchema.parse(input);
  try {
    return await prisma.supplier.update({
      where: { id },
      data: {
        name: data.name,
        contactName: data.contactName ?? null,
        email: data.email ?? null,
        phone: data.phone ?? null,
        address: data.address ?? null,
      },
    });
  } catch (error) {
    rethrow(error, "supplier", data.name);
  }
}

export async function deleteSupplier(id: string) {
  const { count } = await prisma.supplier.deleteMany({ where: { id } });
  if (count === 0) throw new AppError("NOT_FOUND", "This supplier no longer exists.");
}
