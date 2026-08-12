import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { compare } from "bcryptjs";
import { prisma } from "@/src/lib/db/prisma";
import { authenticateAdmin } from "@/src/lib/auth/admin-credentials";

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [
    Credentials({
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        return authenticateAdmin(credentials, {
          findByEmail: (email) => prisma.adminUser.findUnique({
            where: { email },
            select: { id: true, name: true, email: true, passwordHash: true, isActive: true },
          }),
          verifyPassword: compare,
        });
      },
    }),
  ],
  pages: { signIn: "/admin/login" },
  session: { strategy: "jwt" },
  callbacks: {
    jwt({ token, user }) {
      if (user?.id) token.adminId = user.id;
      return token;
    },
    session({ session, token }) {
      if (token.adminId && session.user) session.user.id = token.adminId;
      return session;
    },
  },
});
