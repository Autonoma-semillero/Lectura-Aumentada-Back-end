const MONGO_OBJECT_ID_PATTERN = /^[a-f0-9]{24}$/i;

export function isMongoObjectId(value: string): boolean {
  return MONGO_OBJECT_ID_PATTERN.test(value);
}
