import { NextAuthOptions } from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import bcrypt from 'bcryptjs';
import { readSheet } from '@/lib/sheets';

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: 'Credentials',
      credentials: {
        username: { label: 'Username', type: 'text' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        if (!credentials?.username || !credentials?.password) {
          throw new Error('Please enter username and password');
        }

        try {
          const rows = await readSheet('users');
          
          if (!rows || rows.length < 2) {
            throw new Error('No users found');
          }

          const users = rows.slice(1);
          const user = users.find((row) => row[2] === credentials.username);

          if (!user) {
            throw new Error('Invalid username or password');
          }

          const isPasswordValid = await bcrypt.compare(credentials.password, user[3]);

          if (!isPasswordValid) {
            throw new Error('Invalid username or password');
          }

          return {
            id: user[0],
            name: user[1],
            email: user[2],
            role: user[4],
            permissions: {
              dashboard: user[5] === 'TRUE' || user[5] === true,
              attendance: user[6] === 'TRUE' || user[6] === true,
              registration_request: user[7] === 'TRUE' || user[7] === true,
              setting: user[8] === 'TRUE' || user[8] === true,
            },
          };
        } catch (error) {
          console.error('Auth error:', error);
          throw error;
        }
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = user.role;
        token.permissions = user.permissions;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
        session.user.role = token.role as string;
        session.user.permissions = token.permissions as any;
      }
      return session;
    },
  },
  pages: {
    signIn: '/login',
    error: '/login',
  },
  session: {
    strategy: 'jwt',
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
  secret: process.env.NEXTAUTH_SECRET,
  debug: process.env.NODE_ENV === 'development',
};
