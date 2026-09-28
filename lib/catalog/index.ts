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
import editorPicksJson from '../../data/editor-picks.json';
import type { z } from 'zod';
import {
  briefsFileSchema,
  editorPicksFileSchema,
  modelsFileSchema,
  productsFileSchema,
  reviewsFileSchema,
  signalsFileSchema,
  tasksFileSchema,
  type Brief,
  type EditorPick,
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
  /** Kanıtsız görevde öne çıkarılan araç ("RouteAI tavsiyesi"); görev başına en fazla bir. */
  editorPicks: EditorPick[];
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
  editorPicks?: unknown;
}): Catalog {
  const tasks = parse<Task[]>('tasks.json', tasksFileSchema, raw.tasks);
  const products = parse<Product[]>('products.json', productsFileSchema, raw.products);
  const models = parse<Model[]>('models.json', modelsFileSchema, raw.models);
  const briefs = parse<Brief[]>('briefs.json', briefsFileSchema, raw.briefs);
  const reviews = parse<ExpertReview[]>('reviews.json', reviewsFileSchema, raw.reviews);
  const signals = parse<Signal[]>('signals.json', signalsFileSchema, raw.signals);
  const editorPicks = parse<EditorPick[]>('editor-picks.json', editorPicksFileSchema, raw.editorPicks ?? []);

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

  // Seçim sadece o görevde aktif bir katalog ürünü olabilir (katalogda olmayan araç önerilmez).
  const seenPick = new Set<string>();
  for (const pick of editorPicks) {
    const product = productsById.get(pick.productId);
    if (!product || product.status !== 'active' || !product.tasks.includes(pick.taskId)) {
      throw new Error(`[catalog] data/editor-picks.json: ${pick.taskId} -> ${pick.productId} bu görevde aktif bir ürün değil`);
    }
    if (seenPick.has(pick.taskId)) throw new Error(`[catalog] data/editor-picks.json: ${pick.taskId} için birden fazla seçim`);
    seenPick.add(pick.taskId);
  }

  return { tasks, products, models, briefs, reviews, signals, editorPicks, tasksById, productsById, productsByTask, modelsById };
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
      editorPicks: editorPicksJson,
    });
  }
  return cached;
}
