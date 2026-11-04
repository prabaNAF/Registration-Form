declare namespace Cloudflare {
  interface Env {
    DB?: D1Database;
    BUCKET?: R2Bucket;
    ADMIN_EMAILS?: string;
    REGISTRATION_CONTEXT_SECRET?: string;
    PUBLIC_REGISTRATION_ORIGINS?: string;
    PUBLIC_SITE_URL?: string;
  }
}
