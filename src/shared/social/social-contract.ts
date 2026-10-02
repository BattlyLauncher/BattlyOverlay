export interface SocialFriend {
  readonly activity: string;
  readonly gameVersion?: string;
  readonly client: string;
  readonly status: 'offline' | 'online';
  readonly server: { readonly host: string; readonly port: number } | null;
  readonly username: string;
  readonly userId: string;
}
