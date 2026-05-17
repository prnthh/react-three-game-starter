const baseUrl = import.meta.env.BASE_URL || "/";

export const BASE_PATH = baseUrl === "/" ? "" : baseUrl.endsWith("/") ? baseUrl : `${baseUrl}/`;

export function assetPath(path: string) {
    if (!path || path.startsWith("data:") || path.startsWith("http://") || path.startsWith("https://")) {
        return path;
    }

    const normalizedBasePath = BASE_PATH.replace(/\/$/, "");
    const normalizedPath = path.startsWith("/") ? path : `/${path}`;

    return `${normalizedBasePath}${normalizedPath}`;
}
