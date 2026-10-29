import { Suspense } from "react";
import type { Metadata } from "next";
import { Shapes } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  AddDefaultsButton,
  CategoryCard,
  NewCategoryButton,
} from "@/components/categories/CategorySheets";
import { getCategories } from "@/lib/data/categories";
import type { Category, TxType } from "@/lib/finance/types";

export const metadata: Metadata = { title: "Categorías · Bingo" };

export default function CategoriesPage() {
  return (
    <main className="space-y-5">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Categorías</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Organiza tus movimientos a tu manera, con subcategorías para el detalle.
        </p>
      </div>
      <Suspense fallback={<CategoriesSkeleton />}>
        <CategoriesContent />
      </Suspense>
    </main>
  );
}

async function CategoriesContent() {
  const categories = await getCategories();
  const byType = (type: TxType) => categories.filter((c) => c.type === type);

  if (categories.length === 0) return <EmptyCategories />;

  return (
    <Tabs defaultValue="expense" className="gap-4">
      <TabsList className="grid h-11 w-full grid-cols-2 sm:w-80">
        <TabsTrigger value="expense">Gastos</TabsTrigger>
        <TabsTrigger value="income">Ingresos</TabsTrigger>
      </TabsList>
      {(["expense", "income"] as const).map((type) => (
        <TabsContent key={type} value={type} className="space-y-4">
          <div className="flex flex-wrap gap-2">
            <NewCategoryButton type={type} />
            <AddDefaultsButton variant="outline" />
          </div>
          <CategoryList categories={byType(type)} type={type} />
        </TabsContent>
      ))}
    </Tabs>
  );
}

function CategoryList({ categories, type }: { categories: Category[]; type: TxType }) {
  if (categories.length === 0) {
    return (
      <p className="rounded-2xl border border-dashed p-6 text-center text-sm text-muted-foreground">
        Todavía no tienes categorías de {type === "income" ? "ingresos" : "gastos"}.
      </p>
    );
  }
  return (
    <ul className="grid gap-3 md:grid-cols-2">
      {categories.map((c) => (
        <li key={c.id}>
          <CategoryCard category={c} />
        </li>
      ))}
    </ul>
  );
}

function EmptyCategories() {
  return (
    <div className="flex flex-col items-center rounded-3xl border border-dashed px-6 py-10 text-center">
      <span className="grid size-14 place-items-center rounded-2xl bg-muted">
        <Shapes className="size-7 text-muted-foreground" />
      </span>
      <h2 className="mt-4 text-lg font-semibold">Arma tus categorías</h2>
      <p className="mt-1 max-w-sm text-sm text-muted-foreground">
        Empieza con nuestras sugerencias (Servicios, Mercado, Carro, Sueldo…) y ajústalas, o crea las
        tuyas desde cero.
      </p>
      <div className="mt-6 flex w-full max-w-xs flex-col gap-2">
        <AddDefaultsButton className="h-11" />
        <NewCategoryButton type="expense" className="h-11" />
      </div>
    </div>
  );
}

function CategoriesSkeleton() {
  return (
    <div className="space-y-4">
      <Skeleton className="h-11 w-full sm:w-80" />
      <div className="grid gap-3 md:grid-cols-2">
        {Array.from({ length: 4 }, (_, i) => (
          <Skeleton key={i} className="h-24 rounded-2xl" />
        ))}
      </div>
    </div>
  );
}
