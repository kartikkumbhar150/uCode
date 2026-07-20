import bcrypt from 'bcryptjs';
import { eq } from 'drizzle-orm';
import { getDb } from '../config/db';
import { users, type User as UserRow, type NewUser } from '../config/schema';

// ─── Interface (mirrors the Mongoose IUser shape) ────────────────────────────
export interface IUser {
  _id: string;
  name: string;
  email: string;
  password?: string;
  googleId?: string;
  profilePhoto?: string;
  categories: string[];
  createdAt: Date;
  updatedAt: Date;
  // Methods
  matchPassword(enteredPassword: string): Promise<boolean>;
  save(): Promise<IUser>;
}

// ─── Helper: row → IUser ─────────────────────────────────────────────────────
const rowToUser = (row: UserRow): IUser => {
  const categories =
    row.categories && row.categories.length > 0
      ? row.categories.split(',')
      : ['Study', 'DSA', 'Work', 'Gym', 'Sleep', 'Social Media', 'Gaming', 'Rest', 'Other'];

  return {
    _id: row.id,
    name: row.name,
    email: row.email,
    password: row.password ?? undefined,
    googleId: row.googleId ?? undefined,
    profilePhoto: row.profilePhoto ?? '',
    categories,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,

    async matchPassword(enteredPassword: string): Promise<boolean> {
      if (!row.password) return false;
      return bcrypt.compare(enteredPassword, row.password);
    },

    async save(): Promise<IUser> {
      const db = getDb();
      const categoriesStr = this.categories.join(',');

      let hashedPassword = this.password;
      // Hash if password looks unhashed (not a bcrypt hash)
      if (hashedPassword && !hashedPassword.startsWith('$2')) {
        const salt = await bcrypt.genSalt(10);
        hashedPassword = await bcrypt.hash(hashedPassword, salt);
      }

      const [updated] = await db
        .update(users)
        .set({
          name: this.name,
          email: this.email,
          password: hashedPassword ?? null,
          googleId: this.googleId ?? null,
          profilePhoto: this.profilePhoto ?? '',
          categories: categoriesStr,
          updatedAt: new Date(),
        })
        .where(eq(users.id, this._id))
        .returning();

      return rowToUser(updated);
    },
  };
};

// ─── Static model methods ─────────────────────────────────────────────────────
const User = {
  async find(): Promise<IUser[]> {
    const db = getDb();
    const rows = await db.select().from(users);
    return rows.map(rowToUser);
  },

  async findById(id: string): Promise<IUser | null> {
    const db = getDb();
    const [row] = await db.select().from(users).where(eq(users.id, id)).limit(1);
    return row ? rowToUser(row) : null;
  },

  async findOne(filter: { email?: string; googleId?: string }): Promise<IUser | null> {
    const db = getDb();
    let row: UserRow | undefined;

    if (filter.email) {
      [row] = await db.select().from(users).where(eq(users.email, filter.email)).limit(1);
    } else if (filter.googleId) {
      [row] = await db.select().from(users).where(eq(users.googleId, filter.googleId!)).limit(1);
    }

    return row ? rowToUser(row) : null;
  },

  async create(data: {
    name: string;
    email: string;
    password?: string;
    googleId?: string;
    profilePhoto?: string;
    categories?: string[];
  }): Promise<IUser> {
    const db = getDb();

    let hashedPassword: string | undefined;
    if (data.password) {
      const salt = await bcrypt.genSalt(10);
      hashedPassword = await bcrypt.hash(data.password, salt);
    }

    const categoriesStr = data.categories
      ? data.categories.join(',')
      : 'Study,DSA,Work,Gym,Sleep,Social Media,Gaming,Rest,Other';

    const insert: NewUser = {
      name: data.name,
      email: data.email,
      password: hashedPassword ?? null,
      googleId: data.googleId ?? null,
      profilePhoto: data.profilePhoto ?? '',
      categories: categoriesStr,
    };

    const [row] = await db.insert(users).values(insert).returning();
    return rowToUser(row);
  },
};

export default User;
