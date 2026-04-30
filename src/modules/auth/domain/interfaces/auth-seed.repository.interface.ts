export interface AuthSeedUserInput {
  email: string;
  passwordHash: string;
  displayName: string;
  roles: string[];
}

export interface IAuthSeedRepository {
  createDemoUserIfNotExists(input: AuthSeedUserInput): Promise<boolean>;
}
