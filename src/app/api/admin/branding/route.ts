import { NextResponse } from "next/server";
import { promises as fs } from "node:fs";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { getBranding, updateBrandingLogo } from "@/lib/configStore";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const UPLOAD_SUBDIR = "uploads";
const UPLOAD_DIR = path.join(process.cwd(), "public", UPLOAD_SUBDIR);
const MAX_FILE_SIZE_BYTES = 2 * 1024 * 1024; // 2MB

const MIME_EXTENSION_MAP: Record<string, string> = {
  "image/png": ".png",
  "image/jpeg": ".jpg",
  "image/jpg": ".jpg",
  "image/webp": ".webp",
  "image/gif": ".gif",
  "image/svg+xml": ".svg",
};

async function ensureUploadDir() {
  await fs.mkdir(UPLOAD_DIR, { recursive: true });
}

function resolveExtension(file: File) {
  const nameExt = path.extname(file.name || "").toLowerCase();
  if (nameExt && Object.values(MIME_EXTENSION_MAP).includes(nameExt)) {
    return nameExt;
  }
  const mimeExt = MIME_EXTENSION_MAP[file.type || ""];
  return mimeExt ?? ".png";
}

function buildRelativePath(filename: string) {
  return `/${UPLOAD_SUBDIR}/${filename}`;
}

async function deleteIfManagedAsset(relativePath: string | null) {
  if (!relativePath || !relativePath.startsWith(`/${UPLOAD_SUBDIR}/`)) {
    return;
  }
  const absolutePath = path.join(process.cwd(), "public", relativePath);
  try {
    await fs.unlink(absolutePath);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "ENOENT") {
      console.warn("[branding] remove asset failed", error);
    }
  }
}

export async function GET() {
  const branding = await getBranding();
  return NextResponse.json(branding);
}

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const file = formData.get("logo");
    if (!(file instanceof File)) {
      return NextResponse.json(
        { error: "ไม่พบไฟล์โลโก้ กรุณาแนบไฟล์ก่อนบันทึก" },
        { status: 400 },
      );
    }
    const size = file.size;
    if (size === 0) {
      return NextResponse.json(
        { error: "ไฟล์ว่างเปล่า กรุณาเลือกไฟล์อื่น" },
        { status: 400 },
      );
    }
    if (size > MAX_FILE_SIZE_BYTES) {
      return NextResponse.json(
        { error: "ไฟล์ใหญ่เกินกำหนด (สูงสุด 2MB)" },
        { status: 400 },
      );
    }
    if (file.type && !file.type.startsWith("image/")) {
      return NextResponse.json(
        { error: "รองรับเฉพาะไฟล์ภาพเท่านั้น" },
        { status: 400 },
      );
    }

    const extension = resolveExtension(file);
    const filename = `branding-logo-${Date.now()}-${randomUUID()}${extension}`;
    const relativePath = buildRelativePath(filename);
    const targetPath = path.join(UPLOAD_DIR, filename);

    await ensureUploadDir();
    const buffer = Buffer.from(await file.arrayBuffer());
    await fs.writeFile(targetPath, buffer);

    const previousBranding = await getBranding();
    const branding = await updateBrandingLogo(relativePath);

    if (previousBranding.logoPath && previousBranding.logoPath !== relativePath) {
      await deleteIfManagedAsset(previousBranding.logoPath);
    }

    return NextResponse.json(branding);
  } catch (error) {
    console.error("[branding] upload failed", error);
    return NextResponse.json(
      { error: "ไม่สามารถอัปโหลดโลโก้ได้ กรุณาลองใหม่อีกครั้ง" },
      { status: 500 },
    );
  }
}

export async function DELETE() {
  try {
    const previousBranding = await getBranding();
    if (previousBranding.logoPath) {
      await deleteIfManagedAsset(previousBranding.logoPath);
    }
    const branding = await updateBrandingLogo(null);
    return NextResponse.json(branding);
  } catch (error) {
    console.error("[branding] reset failed", error);
    return NextResponse.json(
      { error: "ไม่สามารถรีเซ็ตโลโก้ได้ กรุณาลองอีกครั้ง" },
      { status: 500 },
    );
  }
}
