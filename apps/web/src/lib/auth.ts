import type { NextAuthOptions } from 'next-auth';
import GoogleProvider from 'next-auth/providers/google';
import GitHubProvider from 'next-auth/providers/github';

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
  ],

  pages: {
    signIn: '/auth/signin',
    error: '/auth/signin',
  },

  callbacks: {
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
        if (token.id) session.user.id = token.id;
        if (token.provider) session.user.provider = token.provider;
        if (token.picture) session.user.image = token.picture as string;
      }
      return session;
    },
  },

  session: {
    strategy: 'jwt',
  },
};

// Augment next-auth types
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
