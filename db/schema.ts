import {
  pgTable,
  serial,
  text,
  integer,
  boolean,
  timestamp,
  jsonb,
  unique,
} from "drizzle-orm/pg-core";

// Top-level catalogue sections (e.g. "Hotwheels", "Vial Storage").
export const categories = pgTable("categories", {
  id: serial().primaryKey(),
  slug: text().notNull().unique(),
  displayName: text("display_name").notNull(),
  themeColor: text("theme_color").notNull().default("#00E5FF"),
  sortOrder: integer("sort_order").notNull().default(0),
  createdAt: timestamp("created_at").defaultNow(),
});

// Groupings within a category (e.g. "Display Racks", "3ml Cases").
export const subcategories = pgTable(
  "subcategories",
  {
    id: serial().primaryKey(),
    categoryId: integer("category_id")
      .notNull()
      .references(() => categories.id, { onDelete: "cascade" }),
    slug: text().notNull(),
    displayName: text("display_name").notNull(),
    sortOrder: integer("sort_order").notNull().default(0),
    createdAt: timestamp("created_at").defaultNow(),
  },
  (t) => [unique().on(t.categoryId, t.slug)],
);

// Individual sellable items.
export const products = pgTable(
  "products",
  {
    id: serial().primaryKey(),
    subcategoryId: integer("subcategory_id")
      .notNull()
      .references(() => subcategories.id, { onDelete: "cascade" }),
    slug: text().notNull(),
    displayName: text("display_name").notNull(),
    description: text().notNull().default(""),
    price: text().notNull().default("0.00"),
    featured: boolean().notNull().default(false),
    sortOrder: integer("sort_order").notNull().default(0),
    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow(),
  },
  (t) => [unique().on(t.subcategoryId, t.slug)],
);

// Product images. Uploaded photos live in Netlify Blobs (blobKey); photos
// carried over from the original static site keep their public path (staticUrl).
export const photos = pgTable("photos", {
  id: serial().primaryKey(),
  productId: integer("product_id")
    .notNull()
    .references(() => products.id, { onDelete: "cascade" }),
  blobKey: text("blob_key"),
  staticUrl: text("static_url"),
  contentType: text("content_type"),
  filaments: jsonb().$type<string[] | null>(),
  texture: text(),
  isDefault: boolean("is_default").notNull().default(false),
  sortOrder: integer("sort_order").notNull().default(0),
  createdAt: timestamp("created_at").defaultNow(),
});

// Editable pieces of site copy that the owner can change from the admin portal
// (e.g. the landing-page intro message). Stored as simple key/value rows so new
// editable strings can be added without a schema change.
export const siteSettings = pgTable("site_settings", {
  key: text().primaryKey(),
  value: text().notNull().default(""),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// The filament colour library shown on the public "Colours" page and managed
// from the admin portal. The supplier/brand is deliberately NOT stored here so
// it can never leak to the frontend. `status` is one of a fixed set:
// "In Stock", "Out of Stock", or "On Order".
export const filaments = pgTable("filaments", {
  id: serial().primaryKey(),
  name: text().notNull(),
  material: text().notNull().default(""),
  hex: text().notNull().default("#000000"),
  status: text().notNull().default("In Stock"),
  sortOrder: integer("sort_order").notNull().default(0),
  createdAt: timestamp("created_at").defaultNow(),
});
