import NextAuth from "next-auth";
import { PrismaAdapter } from "@auth/prisma-adapter";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { db } from "@/lib/db";
import { isPortalTokenUsable } from "@/lib/portal/token";

export const { handlers, signIn, signOut, auth } = NextAuth({
  adapter: PrismaAdapter(db),
  session: { strategy: "jwt" },
  providers: [
    Credentials({
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;

        const user = await db.user.findUnique({
          where: { email: credentials.email as string },
        });

        if (!user?.password) return null;
        if (!user.active) return null;
        if (!user.emailVerified) return null;

        const valid = await bcrypt.compare(
          credentials.password as string,
          user.password
        );

        if (!valid) return null;

        return {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
        };
      },
    }),
    // Passwordless portal login (parents + athletes). Consumes a single-use
    // PortalMagicToken minted by the join/login server actions. The email on the
    // token — sent only to the real inbox on file — is the proof of identity.
    Credentials({
      id: "portal-magic-link",
      name: "Portal Magic Link",
      credentials: {
        token: { label: "Token", type: "text" },
      },
      async authorize(credentials) {
        const token = credentials?.token;
        if (typeof token !== "string" || token.length === 0) return null;

        const record = await db.portalMagicToken.findUnique({ where: { token } });
        if (!record) return null;
        if (!isPortalTokenUsable(record)) return null;

        // Atomically consume the token so a replayed/concurrent request can't
        // reuse it (single-use guarantee even under a race).
        const consumed = await db.portalMagicToken.updateMany({
          where: { id: record.id, used: false },
          data: { used: true },
        });
        if (consumed.count === 0) return null;

        const email = record.email;
        const existing = await db.user.findUnique({ where: { email } });

        // Never hijack or grant portal access to an existing coach/admin/client
        // account — they sign in normally. Email is unique on User.
        if (existing && existing.role !== "PORTAL") return null;
        if (existing && !existing.active) return null;

        const user =
          existing ??
          (await db.user.create({
            data: {
              email,
              role: "PORTAL",
              active: true,
              emailVerified: new Date(),
            },
          }));

        return {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = (user as { role: string }).role;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
        session.user.role = token.role as string;
      }
      return session;
    },
  },
  pages: {
    signIn: "/login",
  },
});
