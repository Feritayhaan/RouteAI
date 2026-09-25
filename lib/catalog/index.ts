// Katalog yükleyici — edge uyumlu (fs yok, JSON'lar import edilir).
//
// Doğrulama ve indeksleme modül düzeyinde BİR kez yapılır; loadCatalog() her
// çağrıda aynı nesneyi döner. Veri bozuksa ilk yüklemede açık bir hatayla
// patlar (sessizce yanlış öneri vermektense).

import tasksJson from '../../data/tasks.json';
import productsJson from '../../data/products.json';
import modelsJson from '../../data/models.json';
import briefsJson from '../../data/briefs.json';
import reviewsJson from '../../data/reviews.json';
import signalsJson from '../../data/signals.json';
import type { z } from 'zod';
import {
  briefsFileSchema,
  modelsFileSchema,
  productsFileSchema,
  reviewsFileSchema,
  signalsFileSchema,
  tasksFileSchema,
  type Brief,
  type ExpertReview,
  type Model,
  type Product,
  type Signal,
  type Task,
} from './schema';

export interface Catalog {
  tasks: Task[];
  products: Product[];
  models: Model[];
  briefs: Brief[];
  reviews: ExpertReview[];
  signals: Signal[];
  tasksById: Map<string, Task>;
  productsById: Map<string, Product>;
  /** Sadece status 'active' ürünler. */
  productsByTask: Map<string, Product[]>;
  modelsById: Map<string, Model>;
}

function parse<T>(name: string, schema: z.ZodType<T>, data: unknown): T {
  const result = schema.safeParse(data);
  if (!result.success) {
    const first = result.error.issues[0];
    throw new Error(`[catalog] data/${name} geçersiz: ${first.path.join('.')} — ${first.message}`);
  }
  return result.data;
}

export function buildCatalog(raw: {
  tasks: unknown;
  products: unknown;
  models: unknown;
  briefs: unknown;
  reviews: unknown;
  signals: unknown;
}): Catalog {
  const tasks = parse<Task[]>('tasks.json', tasksFileSchema, raw.tasks);
  const products = parse<Product[]>('products.json', productsFileSchema, raw.products);
  const models = parse<Model[]>('models.json', modelsFileSchema, raw.models);
  const briefs = parse<Brief[]>('briefs.json', briefsFileSchema, raw.briefs);
  const reviews = parse<ExpertReview[]>('reviews.json', reviewsFileSchema, raw.reviews);
  const signals = parse<Signal[]>('signals.json', signalsFileSchema, raw.signals);

  const tasksById = new Map(tasks.map((t) => [t.id, t]));
  const productsById = new Map(products.map((p) => [p.id, p]));
  const modelsById = new Map(models.map((m) => [m.id, m]));

  const productsByTask = new Map<string, Product[]>(tasks.map((t) => [t.id, []]));
  for (const product of products) {
    if (product.status !== 'active') continue;
    for (const taskId of product.tasks) {
      productsByTask.get(taskId)?.push(product);
    }
  }

  return { tasks, products, models, briefs, reviews, signals, tasksById, productsById, productsByTask, modelsById };
}

let cached: Catalog | null = null;

export function loadCatalog(): Catalog {
  if (!cached) {
    cached = buildCatalog({
      tasks: tasksJson,
      products: productsJson,
      models: modelsJson,
      briefs: briefsJson,
      reviews: reviewsJson,
      signals: signalsJson,
    });
  }
  return cached;
}
