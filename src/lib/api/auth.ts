import type { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import GoogleProvider from "next-auth/providers/google";
import { PrismaAdapter } from "@next-auth/prisma-adapter";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";

const providers: NextAuthOptions["providers"] = [];

if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
  providers.push(
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    }),
  );
}

providers.push(
  CredentialsProvider({
    id: "credentials",
    name: "Email & Password",
    credentials: {
      email: { label: "Email", type: "email" },
      password: { label: "Password", type: "password" },
    },
    async authorize(credentials) {
      if (!credentials?.email || !credentials?.password) return null;

      const user = await prisma.user.findUnique({
        where: { email: credentials.email },
      });

      if (!user || !user.passwordHash) return null;

      const isValid = await bcrypt.compare(
        credentials.password,
        user.passwordHash,
      );

      if (!isValid) return null;

      return { id: user.id, email: user.email, name: user.name };
    },
  }),
);

if (process.env.NODE_ENV === "development") {
  providers.push(
    CredentialsProvider({
      id: "dev-login",
      name: "Dev Login",
      credentials: {
        email: {
          label: "Email",
          type: "email",
          placeholder: "dev@poddigest.local",
        },
        name: { label: "Name", type: "text", placeholder: "Dev User" },
      },
      async authorize(credentials) {
        if (!credentials?.email) return null;

        const email = credentials.email;
        const name = credentials.name || "Dev User";

        const user = await prisma.user.upsert({
          where: { email },
          create: { email, name },
          update: { name },
        });

        return { id: user.id, email: user.email, name: user.name };
      },
    }),
  );
}

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma),
  providers,
  session: {
    strategy: "jwt",
  },
  callbacks: {
    async session({ session, token }) {
      if (session.user && token.sub) {
        session.user.id = token.sub;
      }
      return session;
    },
    async jwt({ token, user }) {
      if (user) {
        token.sub = user.id;
      }
      return token;
    },
  },
  pages: {
    signIn: "/auth/signin",
  },
};
