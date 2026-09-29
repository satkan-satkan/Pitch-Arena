import sharp from "sharp";
import { z } from "zod";

// Small, self-contained images use existing database snapshots and backups.
// No remote URLs, SVG, external image host or public access to profile data.
export const imageSchema = z
  .string()
  .max(64000)
  .refine(
    (value) =>
      !value ||
      /^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/]+={0,2}$/.test(value),
  )
  .default("");
export async function normalizeImage(value, previous = "") {
  if (!value || value === previous) return value;
  try {
    const bytes = Buffer.from(value.slice(value.indexOf(",") + 1), "base64");
    const input = sharp(bytes, { limitInputPixels: 16000000, animated: false });
    const meta = await input.metadata();
    if (!["png", "jpeg", "webp"].includes(meta.format) || (meta.pages || 1) > 1)
      throw new Error();
    const image = await input
      .rotate()
      .resize(256, 256, { fit: "cover" })
      .webp({ quality: 82 })
      .toBuffer();
    const result = `data:image/webp;base64,${image.toString("base64")}`;
    if (result.length > 64000) throw new Error();
    return result;
  } catch {
    throw Object.assign(new Error("INVALID_IMAGE"), { status: 400 });
  }
}
export async function normalizeListingImages(data, previous = {}) {
  data.logo = await normalizeImage(data.logo, previous.logo);
  data.founderAvatar = await normalizeImage(
    data.founderAvatar,
    previous.founderAvatar,
  );
  return data;
}
