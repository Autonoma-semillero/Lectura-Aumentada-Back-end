"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const config_1 = require("@nestjs/config");
function getEnv(name) {
    const value = process.env[name];
    if (value === undefined) {
        return undefined;
    }
    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : undefined;
}
function isValidMongoUri(uri) {
    try {
        void new URL(uri);
        return true;
    }
    catch {
        return false;
    }
}
function sanitizeMongoUri(rawUri) {
    if (isValidMongoUri(rawUri)) {
        return rawUri;
    }
    const withAuthMatch = rawUri.match(/^(mongodb(?:\+srv)?:\/\/)([^@/]+)@(.+)$/i);
    if (!withAuthMatch) {
        return rawUri;
    }
    const [, protocol, auth, rest] = withAuthMatch;
    const separatorIndex = auth.indexOf(':');
    if (separatorIndex < 0) {
        return rawUri;
    }
    const user = auth.slice(0, separatorIndex);
    const password = auth.slice(separatorIndex + 1);
    const encodedUser = encodeURIComponent(user);
    const encodedPassword = encodeURIComponent(password);
    return `${protocol}${encodedUser}:${encodedPassword}@${rest}`;
}
function buildMongoUriFromParts() {
    const host = getEnv('MONGODB_HOST');
    const port = getEnv('MONGODB_PORT') ?? '27017';
    const db = getEnv('MONGODB_DB') ?? getEnv('MONGODB_DATABASE');
    if (!host || !db) {
        return undefined;
    }
    const user = getEnv('MONGODB_USER') ?? getEnv('MONGODB_USERNAME');
    const password = getEnv('MONGODB_PASSWORD');
    const authSource = getEnv('MONGODB_AUTH_SOURCE');
    const query = new URLSearchParams();
    if (authSource) {
        query.set('authSource', authSource);
    }
    const queryString = query.toString();
    const suffix = queryString ? `?${queryString}` : '';
    if (user && password) {
        const encodedUser = encodeURIComponent(user);
        const encodedPassword = encodeURIComponent(password);
        return `mongodb://${encodedUser}:${encodedPassword}@${host}:${port}/${db}${suffix}`;
    }
    return `mongodb://${host}:${port}/${db}${suffix}`;
}
exports.default = (0, config_1.registerAs)('database', () => ({
    uri: sanitizeMongoUri(getEnv('MONGODB_URI') ?? '') ||
        buildMongoUriFromParts() ||
        'mongodb://127.0.0.1:27017/lectura_aumentada_db',
}));
//# sourceMappingURL=database.config.js.map