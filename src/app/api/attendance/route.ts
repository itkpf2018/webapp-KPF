import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { appendLog, getStores } from "@/lib/configStore";
import { assertSupabaseConfig, getSupabaseServiceClient } from "@/lib/supabaseClient";
import type { Database } from "@/types/supabase";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type AttendancePayload = {
  date: string;
  time: string;
  status: string;
  employeeName: string;
  storeName: string;
  note?: string;
  photo: string;
  location?: {
    latitude?: number;
    longitude?: number;
    accuracy?: number;



    
  };
};

type SanitizedPayload = {
  date: string;
  time: string;
  status: "check-in" | "check-out";
  employeeName: string;
  storeName: string;
  note: string | null;
  photo: string;
  location: {
    latitude: number;
    longitude: number;
    accuracy: number | null;
  } | null;
};

type UploadedPhoto = {
  storagePath: string;
  publicUrl: string;
};

type GeofenceResult = {
  isWithin: boolean;
  distance: number | null;
  radius: number | null;
  warning: string | null;
};

const REQUIRED_SUPABASE_ENV: Array<keyof NodeJS.ProcessEnv> = [
  "SUPABASE_URL",
  "SUPABASE_SERVICE_ROLE_KEY",
  "SUPABASE_ATTENDANCE_BUCKET",
];

const MAX_BASE64_LENGTH = 7_000_000; // ~5MB

const ALLOWED_MIME_TYPES: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/gif": "gif",
  "image/heic": "heic",
  "image/heif": "heif",
};

const CLIENT_ERROR_MESSAGES = new Set([
  "กรุณาตั้งค่าตัวแปรสภาพแวดล้อมของ Supabase ให้ครบ",
  "กรุณากรอกวันที่ให้ถูกต้อง",
  "กรุณากรอกเวลาให้ถูกต้อง",
  "กรุณากรอกข้อมูลให้ครบถ้วน",
  "กรุณาเลือกรูปภาพที่ถูกต้อง",
  "ไฟล์รูปมีขนาดใหญ่เกินกำหนด (สูงสุด 5MB)",
  "ไม่สามารถอัปโหลดรูปภาพได้",
  "ไม่สามารถสร้างลิงก์รูปภาพได้",
  "ไม่พบสาขาที่เลือกในระบบ",
]);

function assertEnv() {
  for (const key of REQUIRED_SUPABASE_ENV) {
    if (!process.env[key] || process.env[key]!.trim().length === 0) {
      throw new Error("กรุณาตั้งค่าตัวแปรสภาพแวดล้อมของ Supabase ให้ครบ");
    }
  }
  assertSupabaseConfig();
}

function getSupabaseBucketName() {
  const bucket = process.env.SUPABASE_ATTENDANCE_BUCKET?.trim();
  if (!bucket) {
    throw new Error("กรุณาตั้งค่าตัวแปรสภาพแวดล้อมของ Supabase ให้ครบ");
  }
  return bucket;
}

function normalizeDate(value: string) {
  const trimmed = value?.trim() ?? "";
  if (!trimmed) {
    throw new Error("กรุณากรอกวันที่ให้ถูกต้อง");
  }
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
    return trimmed;
  }
  const dmy = trimmed.match(/^(\d{2})[/-](\d{2})[/-](\d{4})$/);
  if (dmy) {
    const [, day, month, year] = dmy;
    return `${year}-${month}-${day}`;
  }
  const parsed = new Date(trimmed);
  if (Number.isNaN(parsed.valueOf())) {
    throw new Error("กรุณากรอกวันที่ให้ถูกต้อง");
  }
  const year = parsed.getFullYear();
  const month = `${parsed.getMonth() + 1}`.padStart(2, "0");
  const day = `${parsed.getDate()}`.padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function normalizeTime(value: string) {
  const cleaned = value?.trim().replace(/\./g, ":") ?? "";
  const match = cleaned.match(/^(\d{1,2}):(\d{2})$/);
  if (!match) {
    throw new Error("กรุณากรอกเวลาให้ถูกต้อง");
  }
  const hour = Number.parseInt(match[1], 10);
  const minute = Number.parseInt(match[2], 10);
  if (
    !Number.isFinite(hour) ||
    !Number.isFinite(minute) ||
    hour < 0 ||
    hour > 23 ||
    minute < 0 ||
    minute > 59
  ) {
    throw new Error("กรุณากรอกเวลาให้ถูกต้อง");
  }
  return `${hour.toString().padStart(2, "0")}:${minute.toString().padStart(2, "0")}`;
}

function sanitizePayload(payload: AttendancePayload): SanitizedPayload {
  if (!payload) {
    throw new Error("กรุณากรอกข้อมูลให้ครบถ้วน");
  }

  const date = normalizeDate(payload.date);
  const time = normalizeTime(payload.time);
  const status = payload.status?.toLowerCase() === "check-out" ? "check-out" : "check-in";
  const employeeName = payload.employeeName?.trim() ?? "";
  const storeName = payload.storeName?.trim() ?? "";

  if (!employeeName || !storeName) {
    throw new Error("กรุณากรอกข้อมูลให้ครบถ้วน");
  }

  const note = payload.note?.trim() ?? null;

  if (typeof payload.photo !== "string" || payload.photo.trim().length === 0) {
    throw new Error("กรุณาเลือกรูปภาพที่ถูกต้อง");
  }
  const photo = payload.photo.trim();
  if (photo.length > MAX_BASE64_LENGTH) {
    throw new Error("ไฟล์รูปมีขนาดใหญ่เกินกำหนด (สูงสุด 5MB)");
  }

  let location: SanitizedPayload["location"] = null;
  if (payload.location) {
    const { latitude, longitude, accuracy } = payload.location;
    if (
      typeof latitude === "number" &&
      Number.isFinite(latitude) &&
      typeof longitude === "number" &&
      Number.isFinite(longitude)
    ) {
      location = {
        latitude,
        longitude,
        accuracy:
          typeof accuracy === "number" && Number.isFinite(accuracy) ? Math.max(0, accuracy) : null,
      };
    }
  }

  return { date, time, status, employeeName, storeName, note, photo, location };
}

function formatLocation(location: SanitizedPayload["location"]) {
  if (!location) return "";
  const accuracyDisplay =
    typeof location.accuracy === "number" ? `±${Math.round(location.accuracy)}m` : "";
  return `${location.latitude.toFixed(6)},${location.longitude.toFixed(6)} ${accuracyDisplay}`.trim();
}

function parseDataUrl(dataUrl: string) {
  const match = dataUrl.match(/^data:([^;]+);base64,(.+)$/);
  if (!match) {
    throw new Error("กรุณาเลือกรูปภาพที่ถูกต้อง");
  }
  const mimeType = match[1];
  const base64 = match[2];
  const buffer = Buffer.from(base64, "base64");
  if (buffer.length === 0 || !ALLOWED_MIME_TYPES[mimeType]) {
    throw new Error("กรุณาเลือกรูปภาพที่ถูกต้อง");
  }
  return { mimeType, buffer };
}

function createStoragePath(extension: string) {
  const now = new Date();
  const year = now.getFullYear();
  const month = `${now.getMonth() + 1}`.padStart(2, "0");
  const day = `${now.getDate()}`.padStart(2, "0");
  return `attendance/${year}/${month}/${day}/${randomUUID()}.${extension}`;
}

async function uploadPhoto(dataUrl: string): Promise<UploadedPhoto> {
  const { mimeType, buffer } = parseDataUrl(dataUrl);
  const extension = ALLOWED_MIME_TYPES[mimeType];
  const storagePath = createStoragePath(extension);

  const supabase = getSupabaseServiceClient();
  const bucket = getSupabaseBucketName();

  const uploadResult = await supabase.storage.from(bucket).upload(storagePath, buffer, {
    contentType: mimeType,
    upsert: false,
  });

  if (uploadResult.error) {
    console.error("[attendance] photo upload error", uploadResult.error);
    throw new Error("ไม่สามารถอัปโหลดรูปภาพได้");
  }

  const { data: publicData } = supabase.storage.from(bucket).getPublicUrl(storagePath);
  const publicUrl = publicData?.publicUrl;
  if (!publicUrl) {
    throw new Error("ไม่สามารถสร้างลิงก์รูปภาพได้");
  }

  return { storagePath, publicUrl };
}

function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number) {
  const R = 6371_000; // metres
  const toRad = (value: number) => (value * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

async function checkGeofence(
  storeName: string,
  latitude: number | null,
  longitude: number | null,
): Promise<GeofenceResult> {
  if (latitude === null || longitude === null) {
    return { isWithin: true, distance: null, radius: null, warning: null };
  }

  const stores = await getStores();
  const store = stores.find((item) => item.name.trim() === storeName.trim());
  if (!store || !isFinite(store.latitude ?? NaN) || !isFinite(store.longitude ?? NaN)) {
    return { isWithin: true, distance: null, radius: null, warning: null };
  }

  const radius = typeof store.radius === "number" && Number.isFinite(store.radius) ? store.radius : 100;
  const distance = calculateDistance(latitude, longitude, store.latitude!, store.longitude!);

  if (distance <= radius) {
    return { isWithin: true, distance, radius, warning: null };
  }

  const warning = `ตำแหน่งปัจจุบันอยู่นอกพื้นที่ที่กำหนด (ห่าง ${Math.round(
    distance,
  )} ม. เกินรัศมี ${radius} ม.)`;
  return { isWithin: false, distance, radius, warning };
}

function formatSubmittedAt() {
  return new Date();
}

export async function POST(request: Request) {
  try {
    assertEnv();
    const raw = (await request.json()) as AttendancePayload;
    const sanitized = sanitizePayload(raw);

    const supabase = getSupabaseServiceClient();
    const submittedAt = formatSubmittedAt();
    const locationDisplay = formatLocation(sanitized.location);

    const photoUpload = await uploadPhoto(sanitized.photo);

    const geofenceResult = await checkGeofence(
      sanitized.storeName,
      sanitized.location?.latitude ?? null,
      sanitized.location?.longitude ?? null,
    );

    type AttendanceRecordInsert = Database["public"]["Tables"]["attendance_records"]["Insert"];

    const insertPayload: AttendanceRecordInsert = {
      recorded_date: sanitized.date,
      recorded_time: sanitized.time,
      status: sanitized.status,
      employee_name: sanitized.employeeName,
      store_name: sanitized.storeName,
      note: sanitized.note ?? null,
      latitude: sanitized.location?.latitude ?? null,
      longitude: sanitized.location?.longitude ?? null,
      accuracy: sanitized.location?.accuracy ?? null,
      location_display: locationDisplay,
      photo_public_url: photoUpload.publicUrl,
      storage_path: photoUpload.storagePath,
      submitted_at: submittedAt.toISOString(),
    };

    // Workaround for Supabase client type inference issue in build context.
    // The payload is properly typed above as AttendanceRecordInsert to ensure type safety.
    // Using intermediate 'any' cast is necessary here because '.from("attendance_records")'
    // incorrectly infers 'never' in this build context, despite working in other files.
    // This is a known issue with Supabase v2 client singleton type propagation.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error: insertError } = await (supabase as any)
      .from("attendance_records")
      .insert(insertPayload);

    if (insertError) {
      console.error("[attendance] insert error", insertError);
      throw new Error("ไม่สามารถบันทึกข้อมูลได้ กรุณาลองใหม่อีกครั้ง");
    }

    await appendLog({
      scope: "attendance",
      action: "create",
      message: `บันทึกเวลา${sanitized.status === "check-in" ? "เข้า" : "ออก"} - ${sanitized.employeeName}`,
      meta: {
        storeName: sanitized.storeName,
        employeeName: sanitized.employeeName,
        status: sanitized.status,
        submittedAt: submittedAt.toISOString(),
        location: sanitized.location,
        locationDisplay,
        distance: geofenceResult.distance,
        radius: geofenceResult.radius,
        warning: geofenceResult.warning,
        storagePath: photoUpload.storagePath,
      },
    });

    return NextResponse.json({ ok: true, warning: geofenceResult.warning });
  } catch (error) {
    console.error("[attendance] submit error", error);
    const message =
      error instanceof Error ? error.message : "เกิดข้อผิดพลาด กรุณาลองใหม่อีกครั้ง";
    const isClientError = CLIENT_ERROR_MESSAGES.has(message);
    return NextResponse.json(
      { ok: false, message },
      { status: isClientError ? 400 : 500 },
    );
  }
}
