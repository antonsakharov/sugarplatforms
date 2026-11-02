const rawBasePath = process.env.NEXT_PUBLIC_BASE_PATH ?? "";

export const appBasePath = rawBasePath === "/" ? "" : rawBasePath.replace(/\/$/, "");

export function withBasePath(path: string): string {
  if (!path.startsWith("/")) {
    throw new Error(`Application path must start with /: ${path}`);
  }
  return `${appBasePath}${path}`;
}
