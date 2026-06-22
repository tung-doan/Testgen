export default function extractErrorMessage(
  err,
  fallback = "An error occurred",
) {
  if (!err) return fallback;
  if (err.response && err.response.data) {
    const data = err.response.data;
    if (typeof data === "string") return data;
    if (Array.isArray(data)) return data.join("; ");
    if (typeof data === "object") {
      // Common DRF fields
      if (data.detail) return data.detail;
      if (data.error) return data.error;
      if (data.message) return data.message;
      // Validation errors: { field: ["error..."] }
      const firstArray = Object.values(data).find(
        (v) => Array.isArray(v) && v.length > 0,
      );
      if (firstArray) return firstArray.join("; ");
      // Single field error: { field: "error" }
      const firstString = Object.values(data).find(
        (v) => typeof v === "string",
      );
      if (firstString) return firstString;
      try {
        return JSON.stringify(data);
      } catch (e) {
        return fallback;
      }
    }
  }

  if (err.message) return err.message;
  return String(err) || fallback;
}
