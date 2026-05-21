import type { NextAuthOptions } from 'next-auth';
import GoogleProvider from 'next-auth/providers/google';
import GitHubProvider from 'next-auth/providers/github';
import CredentialsProvider from 'next-auth/providers/credentials';

function getApiUrl() {
  return process.env.API_INTERNAL_URL ?? 'http://localhost:4000';
}

function getInternalSecret() {
  return process.env.INTERNAL_API_SECRET ?? 'dev_internal_secret_change_me_12345';
}

export const authOptions: NextAuthOptions = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID ?? '',
      clientSecret: process.env.GOOGLE_CLIENT_SECRET ?? '',
    }),
    GitHubProvider({
      clientId: process.env.GITHUB_CLIENT_ID ?? '',
      clientSecret: process.env.GITHUB_CLIENT_SECRET ?? '',
    }),
    CredentialsProvider({
      name: 'credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;
        try {
          const res = await fetch(`${getApiUrl()}/v1/auth/verify-password`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: credentials.email, password: credentials.password }),
          });
          if (!res.ok) return null;
          const user = await res.json() as { id: string; email: string; displayName: string; avatarUrl: string | null };
          return { id: user.id, email: user.email, name: user.displayName, image: user.avatarUrl ?? null };
        } catch {
          return null;
        }
      },
    }),
  ],

  pages: {
    signIn: '/auth/signin',
    error: '/auth/signin',
  },

  callbacks: {
    async signIn({ user, account, profile }) {
      // OAuth providers: upsert user in DB
      if (account?.provider === 'credentials') return true;

      try {
        const res = await fetch(`${getApiUrl()}/v1/auth/upsert-oauth-user`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${getInternalSecret()}`,
            'x-user-id': 'system',
          },
          body: JSON.stringify({
            email: user.email,
            displayName: user.name ?? user.email,
            avatarUrl: user.image ?? (profile as { avatar_url?: string } | undefined)?.avatar_url ?? null,
            provider: account!.provider,
            providerId: account!.providerAccountId,
          }),
        });
        if (res.status === 409) {
          const err = await res.json() as { existingProvider?: string };
          const existing = err.existingProvider ?? 'another';
          return `/auth/signin?error=provider_conflict&existing=${existing}`;
        }
        if (!res.ok) return false;
        const dbUser = await res.json() as { id: string };
        user.id = dbUser.id;
      } catch {
        return false;
      }
      return true;
    },

    jwt({ token, user, account, profile }) {
      if (user) {
        if (user.id) token.id = user.id;
        if (account?.provider) token.provider = account.provider;
        const ghAvatar = (profile as { avatar_url?: string } | undefined)?.avatar_url;
        token.picture = ghAvatar ?? user.image ?? null;
      }
      return token;
    },

    session({ session, token }) {
      if (session.user) {
        if (token.id) session.user.id = token.id as string;
        if (token.provider) session.user.provider = token.provider as string;
        if (token.picture) session.user.image = token.picture as string;
      }
      return session;
    },
  },

  session: {
    strategy: 'jwt',
  },
};

declare module 'next-auth' {
  interface Session {
    user: {
      id: string;
      name?: string | null;
      email?: string | null;
      image?: string | null;
      provider?: string;
    };
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    id?: string;
    provider?: string;
  }
}
